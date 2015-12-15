.PHONY: all test clean build install

BUILDDIR=bin
BINARY=swarm-demo

VERSION=1.0.0
IMAGE=tauffredou/swarm-demo

GOFLAGS ?= $(GOFLAGS:) -a -installsuffix cgo

all: build

build: main.go
	bower install
	GO15VENDOREXPERIMENT=1 CGO_ENABLED=0 GOOS=linux go build $(GOFLAGS) -o ${BINARY} .

docker:
	docker build -t $(IMAGE) .

run:
	docker-compose up -d