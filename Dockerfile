FROM scratch
COPY bower_components /js
COPY assets /assets
COPY assets/ca-certificates.crt /etc/ssl/certs/
COPY swarm-demo /
EXPOSE 8080
CMD ["/swarm-demo"]
