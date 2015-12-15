package main

import (
	"flag"
	"github.com/samalba/dockerclient"
	"github.com/gorilla/websocket"
	"log"
	"os"
	"os/signal"
	"syscall"
	"net/http"
	"text/template"
	"path/filepath"
	"strings"
	"crypto/tls"
	"io/ioutil"
	"crypto/x509"
)

var (
	connections map[*websocket.Conn]bool = make(map[*websocket.Conn]bool)
	client *dockerclient.DockerClient
	assets = flag.String("assets", "./assets", "path to assets")
	homeTempl *template.Template
	upgrader = &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024}
	tlsConfig *tls.Config
)

// Callback used to listen to Docker's events
func eventCallback(event *dockerclient.Event, ec chan error, args ...interface{}) {
	log.Printf("Received event: %#v\n", *event)
	broadcast(event)
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

	// Get only running containers
	containers, err := client.ListContainers(true, false, "")
	if err != nil {
		log.Fatal(err)
	}
	for _, container := range containers {
		status := map[bool]string{true: "start", false: "die"} [strings.HasPrefix(container.Status, "Up")]
		e := dockerclient.Event{container.Id, status, container.Image, container.Created}
		c.WriteJSON(&e)
	}

	defer c.Close()
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
		log.Printf("recv: %s", message)
		err = c.WriteMessage(mt, message)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}

func broadcast(event *dockerclient.Event) {
	for c := range connections {
		c.WriteJSON(event)
	}
}

func main() {
	homeTempl = template.Must(template.ParseFiles(filepath.Join(*assets, "home.html")))

	host := os.Getenv("DOCKER_HOST")
	if ( host == "") {
		host = "unix:///var/run/docker.sock"
	}else{
		certPath := os.Getenv("DOCKER_CERT_PATH")
		if (certPath != "") {

			cert2_b, _ := ioutil.ReadFile(filepath.Join(certPath,"cert.pem"))
			log.Printf("%s",cert2_b)
			priv2_b, _ := ioutil.ReadFile(filepath.Join(certPath,"key.pem"))
			log.Printf("%s",priv2_b)
			priv2, _ := x509.ParsePKCS1PrivateKey(priv2_b)
			caCert_b, _ := ioutil.ReadFile(filepath.Join(certPath,"ca.pem"))

			caCertPool := x509.NewCertPool()
			caCertPool.AppendCertsFromPEM(caCert_b)

			cert := tls.Certificate{
				Certificate: [][]byte{ cert2_b },
				PrivateKey: priv2,
			}

			tlsConfig = &tls.Config{
				Certificates: []tls.Certificate{cert},
				InsecureSkipVerify: true,
				RootCAs:caCertPool,

			}
		}
	}

	docker, err := dockerclient.NewDockerClient(host, tlsConfig)
	if err != nil {
		log.Fatal(err)
	}

	client = docker

	client.StartMonitorEvents(eventCallback, nil)

	http.HandleFunc("/js/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
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