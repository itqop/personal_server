package main

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func main() {
	complexId := flag.Int("id", 0, "Id for complex to send information.")
	destIP := flag.String("destAddr", "127.0.0.1", "IP address and port to data send to. Example: '127.0.0.1:8080'")
	authType := flag.String("authType", "Insecure", "Auth type could be: Insecure (default), TLS, MTLS")
	flag.Parse()

	var tlsConfig *tls.Config
	// var authTypeString string
	// authTypeString = *authType

	switch *authType {
	case "mtls":
		fmt.Println("AUTH_TYPE set as mtls")
		// Load public/private key pair from a pair of files. The files must contain PEM encoded data.
		cert, err := tls.LoadX509KeyPair("../../Server/server.crt", "../../Server/server.key")
		if err != nil {
			log.Printf("Error while load x509 key pair: %s", err)
			return
		}
		// Load CA cert
		caCert, err := ioutil.ReadFile("../../Server/cacert.pem")
		if err != nil {
			log.Printf("Error while reading CA certificate: %s", err)
			return
		}
		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(caCert)

		tlsConfig = &tls.Config{
			Certificates: []tls.Certificate{cert},
			RootCAs:      caCertPool,
		}
		break

	case "tls":
		fmt.Println("AUTH_TYPE set as tls")
		// Load CA cert
		caCert, err := ioutil.ReadFile("../../Server/cacert.pem")
		if err != nil {
			log.Printf("Error while reading CA certificate: %s", err)
			return
		}
		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(caCert)

		tlsConfig = &tls.Config{
			RootCAs: caCertPool,
		}
		break

	default:
		fmt.Println("Insecure communication selected, skipping server verification")
		tlsConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		MaxIdleConns:    10,
		IdleConnTimeout: 30 * time.Second,
	}
	client := &http.Client{Transport: transport}

	var jsonString = fmt.Sprintf(`{"id":%d,"timestamp":1663155437,"info":[{"type":"level1","value":123.45,"timestamp": 1663155037}]}`, *complexId)
	log.Printf("JSON to send: %s", jsonString)
	var jsonBytes = []byte(jsonString)
	req, err := http.NewRequest("POST", fmt.Sprintf("https://%s/api/sensors/data", *destIP), bytes.NewBuffer(jsonBytes))
	if err != nil {
		log.Printf("Error while creating request: %s", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error while request: %s", err)
	}
	defer resp.Body.Close()

	log.Println("response Status:", resp.Status)
	log.Println("response Headers:", resp.Header)
	body, _ := ioutil.ReadAll(resp.Body)
	log.Println("response Body:", string(body))

	// // ips, err := net.LookupHost("127.0.0.1")
	// // if err == nil {
	// // 	for _, ip := range ips {
	// // 		fmt.Println(ip)
	// // 	}
	// // } else {
	// // 	fmt.Printf("Lookup error: %s", err)
	// // }

	// // dialer := net.Dialer{
	// // 	LocalAddr: &net.TCPAddr{
	// // 		IP:   net.ParseIP("127.0.0.1"),
	// // 		Port: 0,
	// // 	},
	// // }
	// // c, err := dialer.Dial("tcp", CONNECT)
	// conn, err := net.Dial("tcp", *destIP)
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }

	// data := []byte(fmt.Sprintf("{\"id\":%d}", *complexId))
	// _, err = conn.Write(data)
	// if err != nil {
	// 	fmt.Printf("Error while sending connection init data: %s\n", err)
	// }

	// buf := make([]byte, 1024)
	// for {
	// 	_, err := conn.Read(buf)
	// 	if err == io.EOF {
	// 		break
	// 	}
	// }
	// conn.Close()
	// fmt.Println("Connection refused.")
}
