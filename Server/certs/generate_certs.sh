#!/bin/bash
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out cacert.pem -subj "/C=RU/ST=MSK/L=P/O=NIIR/OU=Org/CN=RootCA"

openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr -subj "/C=RU/ST=MSK/L=P/O=NIIR/OU=Org/CN=NIIRSPO"
openssl x509 -req -in server.csr -CA cacert.pem -CAkey ca.key -out server.crt -CAcreateserial -days 365 -sha256 -extfile server_certs.cfg

cp server.crt certbundle.pem
cat cacert.pem >> certbundle.pem