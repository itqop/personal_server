package api

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"

	"main/data_source_interconnection"
	"main/db"

	"github.com/gorilla/mux"
)

func NewSensorsDataPost(writer http.ResponseWriter, request *http.Request) {
	InfoLog.Printf("api::NewSensorsDataPost from %s", request.RemoteAddr)
	url, err := url.Parse(fmt.Sprintf("https://%s", request.RemoteAddr))
	if err != nil {
		ErrorLog.Printf("Error while get remote address: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	remoteHostName := url.Hostname()
	complexInfoString := request.Header.Get("ComplexInfo")

	// InfoLog.Printf("ComplexInfo: %s", complexInfoString)

	connectionDataInfo := data_source_interconnection.CheckConnectionData([]byte(complexInfoString), remoteHostName)
	if !connectionDataInfo.IsValid {
		ErrorLog.Printf("Error while parse complex info: %s", connectionDataInfo.Info)
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("Body (%d): %s...", len(bodyData), string(bodyData[:100]))

	go data_source_interconnection.ProcessComplexInfo(connectionDataInfo.Data.Id, bodyData)

	if EnvParameters.DaysToSaveSensorsData > 0 {
		go db.RemoveOldDataFromSensorsDatabase(EnvParameters.DaysToSaveSensorsData)
	}

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func GetComplexesConfigruration(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	InfoLog.Printf("api::GetComplexesConfigruration GET /api/complexes/%s/configuration from %s", id, request.RemoteAddr)

	url, err := url.Parse(fmt.Sprintf("https://%s", request.RemoteAddr))
	if err != nil {
		ErrorLog.Printf("Error while get remote address: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	remoteHostName := url.Hostname()
	complexInfoString := request.Header.Get("ComplexInfo")

	// InfoLog.Printf("ComplexInfo: %s", complexInfoString)

	connectionDataInfo := data_source_interconnection.CheckConnectionData([]byte(complexInfoString), remoteHostName)
	if !connectionDataInfo.IsValid {
		ErrorLog.Printf("Error while parse complex info: %s", connectionDataInfo.Info)
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	configuration, err := db.GetComplexConfiguration(id)
	if err != nil {
		ErrorLog.Printf("Error while retreiving data from database: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	var resp GetComplexesConfigrurationResponse
	resp.Configuration = configuration
	resp.Message = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}
