package data_source_interconnection

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"strings"
	"time"

	"main/db"
)

type environment struct {
	listener    net.Listener
	connections map[int]net.Conn
	cancelFunc  context.CancelFunc
}

type ComplexStatistic struct {
	IsConnected              bool
	LastDataReceiveTimestamp int64
}

const buffSize = 10 * 1024

var errorBus chan ErrorInfo
var env = &environment{
	connections: make(map[int]net.Conn),
}
var infoLog *log.Logger
var errorLog *log.Logger

var ComplexesStatisticMap map[int]ComplexStatistic = make(map[int]ComplexStatistic)

type ErrorInfo struct {
	err     error
	isFatal bool
}

type ConnectionData struct {
	Timestamp uint
	Id        int
}

type ConnectionDataInfo struct {
	Data    ConnectionData
	IsValid bool
	Info    string
}

type SensorInfo struct {
	SensorType string `json:"type"`
	Value      float64
	Timestamp  int64
}

type ComplexInfo struct {
	Timestamp int64
	Id        int
	Info      []SensorInfo
}

func Run(ctx context.Context, cancel context.CancelFunc) {
	infoLog = log.New(os.Stdout, "INFO (dsi)\t", log.Ldate|log.Ltime|log.Lshortfile)
	errorLog = log.New(os.Stderr, "ERROR (dsi)\t", log.Ldate|log.Ltime|log.Lshortfile)
	errorBus = make(chan ErrorInfo)

	env.cancelFunc = cancel

	go processErrors(ctx)

	//	infoLog.Printf("Createing listener...")
	var err error
	listener, err := net.Listen("tcp", ":5050")
	errorBus <- ErrorInfo{err, true}

	env.listener = listener

	//	fmt.Println("Listen...")

	go processConnections(ctx)
}

func Stop() {
	env.cancelFunc()
	for _, connection := range env.connections {
		connection.Close()
	}
	env.listener.Close()
}

func CheckConnectionData(data []byte, ipAddr string) ConnectionDataInfo {
	var res ConnectionDataInfo
	var resData ConnectionData
	err := json.Unmarshal(data, &resData)
	if err != nil {
		return ConnectionDataInfo{
			IsValid: false,
			Info:    fmt.Sprintf("Error while parsing connection data: %s", err.Error()),
		}
	}

	//Check id corresponds to ip address
	ok, descripton := db.CheckComplex(resData.Id, ipAddr)
	if !ok {
		res.IsValid = false
		res.Data = resData
		res.Info = descripton
		return res
	}

	//@todo check timestamp also

	res.IsValid = true
	res.Data = resData
	return res
}

func ProcessComplexInfo(abonent int, buf []byte) {
	var data ComplexInfo
	err := json.Unmarshal(buf, &data)
	if err != nil {
		errorLog.Printf("Error while parsing data: %s", err)
		return
	}

	if abonent != data.Id {
		errorLog.Printf("Not expected abonent id: %d", data.Id)
		return
	}

	// infoLog.Printf("Data received (abonent %d): '%+v", abonent, data)
	for _, info := range data.Info {
		if info.Timestamp != 0 {
			err = db.AddSensorData(abonent, strings.ToLower(info.SensorType), info.Value, info.Timestamp)
			if err != nil {
				errorLog.Printf("Error while saving sensor data to database: %s", err)
			}
		}
	}
	ComplexesStatisticMap[abonent] = ComplexStatistic{
		IsConnected:              true,
		LastDataReceiveTimestamp: time.Now().Unix(),
	}
}

func checkError() {
	//	infoLog.Printf("data_source_interconnection::checkError [Enter]")
	error := <-errorBus
	if error.err != nil {
		errorLog.Printf("Error: %s\n", error.err)
		if error.isFatal {
			env.cancelFunc()
		}
	}
	//	infoLog.Printf("data_source_interconnection::checkError [Exit]")
}

func processConnections(ctx context.Context) {
	// infoLog.Printf("[Enter]")
	buf := make([]byte, buffSize)
	for {
		//		infoLog.Printf("Accepting...")
		connection, err := env.listener.Accept()
		//		infoLog.Printf("Accepted.")
		errorBus <- ErrorInfo{err, false}

		//		infoLog.Printf("Connection accepted")

		n, err := connection.Read(buf)
		if err == nil && n > 0 {
			dataAsString := string(buf[:n])
			infoLog.Printf("Init connection data received: '%s' from %s\n", dataAsString, connection.RemoteAddr().String())

			ipAddr := connection.RemoteAddr().String()
			if addr, ok := connection.RemoteAddr().(*net.TCPAddr); ok {
				ipAddr = addr.IP.String()
			}

			connectionDataInfo := CheckConnectionData(buf[:n], ipAddr)
			if connectionDataInfo.IsValid {
				env.connections[connectionDataInfo.Data.Id] = connection

				go processInfo(connectionDataInfo.Data.Id, connection, ctx)
				infoLog.Printf("Connected success. Local addr: %s, remote addr: %s, Abonent: %d\n", connection.LocalAddr().String(), connection.RemoteAddr().String(), connectionDataInfo.Data.Id)
			} else {
				connection.Close()
				infoLog.Printf("Connection failed: %s", connectionDataInfo.Info)
			}
		} else {
			connection.Close()
		}
	}
}

func processInfo(abonent int, connection net.Conn, ctx context.Context) {
	//	infoLog.Printf("data_source_interconnection::processInfo [Enter]")
	ComplexesStatisticMap[abonent] = ComplexStatistic{
		IsConnected:              true,
		LastDataReceiveTimestamp: time.Now().Unix(),
	}

	buf := make([]byte, buffSize)
	for {
		n, err := connection.Read(buf)
		if err == io.EOF {
			connection.Close()
			delete(env.connections, abonent)
			ComplexesStatisticMap[abonent] = ComplexStatistic{
				IsConnected:              false,
				LastDataReceiveTimestamp: time.Now().Unix(),
			}
			infoLog.Printf("Connection with abonent %d closed.", abonent)
			infoLog.Printf("Statistic: %+v", ComplexesStatisticMap)
			break
		} else if err != nil {
			errorBus <- ErrorInfo{err, false}
			break
		}
		if n > 0 {
			//Parse data
			infoLog.Printf("Data received (abonent %d): %d bytes", abonent, n)
			processingBuf := make([]byte, n)
			copy(processingBuf, buf[:n])
			go ProcessComplexInfo(abonent, processingBuf)
		}

		go func() {
			select {
			case <-ctx.Done():
				Stop()
				return
			}
		}()
	}
}

func processErrors(ctx context.Context) {
	//	infoLog.Printf("[Enter]")
	for {
		checkError()
		go func() {
			select {
			case <-ctx.Done():
				// infoLog.Printf("[Exit]")
				return
			}
		}()
	}
}
