package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"main/api"
	"main/data_source_interconnection"
	"main/db"
)

func cleanup() {
	data_source_interconnection.Stop()
	db.Stop()
	fmt.Println("Terminated.")
}

func main() {
	InfoLog = log.New(os.Stdout, "INFO (api)\t", log.Ldate|log.Ltime|log.Lshortfile)
	ErrorLog = log.New(os.Stderr, "ERROR (api))\t", log.Ldate|log.Ltime|log.Lshortfile)

	terminationChannel := make(chan os.Signal)
	done := make(chan bool, 1)
	defer close(terminationChannel)
	signal.Notify(terminationChannel, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-terminationChannel
		cleanup()
		done <- true
	}()

	context, cancel := context.WithCancel(context.Background())

	login_delay_max_millis := os.Getenv("LOGIN_DELAY_MAX_MILLIS")
	loginDelayMaxMillis, err := strconv.Atoi(login_delay_max_millis)
	if err != nil {
		loginDelayMaxMillis = 0
	}

	InfoLog.Printf("Awaiting for %d millis...", loginDelayMaxMillis)
	time.Sleep(time.Duration(loginDelayMaxMillis) * time.Millisecond)
	InfoLog.Println("[Done]")

	db.Run(context, cancel)
	data_source_interconnection.Run(context, cancel)
	api.Run(context, cancel)

	<-done
	fmt.Println("Terminated correctly")
}
