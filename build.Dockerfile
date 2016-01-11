FROM golang:1.5

RUN go get github.com/tools/godep

RUN mkdir -p /go/src/github.com/tauffredou/swarm-demo
WORKDIR /go/src/github.com/tauffredou/swarm-demo
COPY Godeps/ /go/src/github.com/tauffredou/swarm-demo/Godeps

RUN godep restore
COPY . ./
