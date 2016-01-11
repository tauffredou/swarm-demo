.PHONY: all test clean build install

BUILDDIR=bin
BINARY=swarm-demo

VERSION=1.0.0
IMAGE=tauffredou/swarm-demo

GOFLAGS ?= $(GOFLAGS:) -a -installsuffix cgo

all: build

build: swarm-demo.go
	GO15VENDOREXPERIMENT=1 CGO_ENABLED=0 GOOS=linux go build $(GOFLAGS) -o ${BINARY} .

image: dist
	cp Dockerfile dist
	docker build -t $(IMAGE) dist

push:
	docker push $(IMAGE)

run-swarm:
	docker-compose -f test.docker-compose.yml  up -d

run:
	 DOCKER_HOST=192.168.99.100:3376 go run swarm-demo.go -assets=assets

logs:
	docker-compose -f test.docker-compose.yml  logs

dist: ${BINARY}
	rm -fr dist && mkdir dist
	cp ${BINARY} dist
	cp -R assets dist/

clean:
	rm -fr dist