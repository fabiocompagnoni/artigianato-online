FROM alpine:latest

RUN apk update && apk add --no-cache openssl

WORKDIR /output

RUN openssl genrsa -out server.key 2048

RUN openssl req -new -key server.key -out server.csr -subj "/CN=localhost"

RUN openssl x509 -req -in server.csr -days 365 -signkey server.key -out server.crt

# Rimuovi il file di richiesta di firma, non è più necessario
RUN rm server.csr

CMD ["true"]