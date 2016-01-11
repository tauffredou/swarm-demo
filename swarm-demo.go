package main

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"flag"
	"github.com/gorilla/websocket"
	"github.com/tauffredou/dockerclient" // Waiting for PR to be accepted
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"text/template"
)

var (
	connections map[*websocket.Conn]bool = make(map[*websocket.Conn]bool)
	client      *dockerclient.DockerClient
	assets = flag.String("assets", "./assets", "path to assets")
	homeTempl   *template.Template
	upgrader = &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024}
)

type SwarmEvent struct {
	Id      string
	Running bool
	Node    string
	Name    string
	Image   string
	Created int64
	Status  string
}

// Callback used to listen to Docker's events
func eventCallback(event *dockerclient.Event, ec chan error, args ...interface{}) {
	log.Printf("Received event: %#v\n", *event)
	swarmEvent := SwarmEvent{
		Id:      event.Id,
		Created: event.Time,
	}
	if event.Status == "destroy" {
		swarmEvent.Status = "destroy"
	}
	swarmEvent.mapEvenFromId()

	broadcast(&swarmEvent)
}

func (se *SwarmEvent) mapEvenFromId() {
	info, err := client.InspectContainer(se.Id)
	if err != nil {
		log.Println(err)
		return
	} else {
		log.Printf("info: %s", info.Name)
		se.Node = info.Node.Name
		se.Name = info.Name
		se.Running = info.State.Running
		if se.Status == "" {
			se.Status = info.State.StateString()
		}
	}
}

func waitForInterrupt() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM, syscall.SIGQUIT)
	for _ = range sigChan {
		client.StopAllMonitorEvents()
		os.Exit(0)
	}
}


func wsHandler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	connections[c] = true

	containers, err := client.ListContainers(true, false, "")
	if err != nil {
		log.Fatal(err)
	}
	for _, container := range containers {
		swarmEvent := SwarmEvent{
			Id:      container.Id,
			Created: container.Created,
		}
		swarmEvent.mapEvenFromId()
		c.WriteJSON(swarmEvent)
	}

	//		defer c.Close()
}

func broadcast(event *SwarmEvent) {
	log.Printf("broadcast: %s", event)
	if (event.Status != "") {
		for c := range connections {
			c.WriteJSON(event)
		}
	}
}

func NewTLSConfig(certPath string) (*tls.Config, error) {
	if certPath != "" {
		cert := filepath.Join(certPath, "cert.pem")
		key := filepath.Join(certPath, "key.pem")
		ca := filepath.Join(certPath, "ca.pem")

		// Read certificates
		certPEMBlock, err := ioutil.ReadFile(cert)
		if err != nil {
			return nil, err
		}
		keyPEMBlock, err := ioutil.ReadFile(key)
		if err != nil {
			return nil, err
		}
		caPEMCert, err := ioutil.ReadFile(ca)
		if err != nil {
			return nil, err
		}

		tlsCert, err := tls.X509KeyPair(certPEMBlock, keyPEMBlock)
		if err != nil {
			return nil, err
		}

		// Create tlsConfig
		tlsConfig := &tls.Config{Certificates: []tls.Certificate{tlsCert}}
		if caPEMCert == nil {
			tlsConfig.InsecureSkipVerify = true
		} else {
			caPool := x509.NewCertPool()
			if !caPool.AppendCertsFromPEM(caPEMCert) {
				return nil, errors.New("Could not add RootCA pem")
			}
			tlsConfig.RootCAs = caPool
		}
		return tlsConfig, nil
	}
	return nil, nil
}

func main() {
	flag.Parse()
	homeTempl = template.Must(template.ParseFiles(filepath.Join(*assets, "templates/home.html")))

	host := os.Getenv("DOCKER_HOST")
	if host == "" {
		host = "unix:///var/run/docker.sock"
	}

	tlsConfig, err := NewTLSConfig(os.Getenv("DOCKER_CERT_PATH"))
	if err != nil {
		log.Fatal(err)
	}

	docker, err := dockerclient.NewDockerClient(host, tlsConfig)
	if err != nil {
		log.Fatal(err)
	}

	client = docker
	client.StartMonitorEvents(eventCallback, nil)

	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		file := filepath.Join(*assets, r.URL.Path[1:])
		http.ServeFile(w, r, file)
	})

	http.HandleFunc("/", func(c http.ResponseWriter, req *http.Request) {
		log.Printf("handle request")
		homeTempl.Execute(c, req.Host)
	})

	http.HandleFunc("/ws", wsHandler)
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}

	waitForInterrupt()
}
