.PHONY: all test clean build install

BUILDDIR=bin
BINARY=swarm-demo

VERSION=1.0.0
IMAGE=tauffredou/swarm-demo

GOFLAGS ?= $(GOFLAGS:) -a -installsuffix cgo

all: build

build: main.go
	GO15VENDOREXPERIMENT=1 CGO_ENABLED=0 GOOS=linux go build $(GOFLAGS) -o ${BINARY} .

image: dist
	cp Dockerfile dist
	docker build -t $(IMAGE) dist


push:
	docker push $(IMAGE)

run:
	docker-compose up -d

js:
	bower install

run-vsct:
	docker-compose -p vsct -f vsct.docker-compose.yml up -d

dist: ${BINARY}
	rm -fr dist && mkdir dist
	cp ${BINARY} dist
	cp -R assets/* dist

clean:
	rm -fr dist