package api

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"main/data_source_interconnection"
	"main/db"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type ComplexesPutHandlerResponse struct {
	Message string
	Id      int
	Name    string
	Ip      string
}

func ComplexesPostHandler(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("POST /api/complexes handler for %s", vars["id"])

	id, err := strconv.Atoi(vars["id"])

	if err != nil {
		http.Error(writer, fmt.Sprintf("Could not get complex id"), http.StatusBadRequest)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	//Проверить ключ доступа при обработке запроса POST api/complexes. Операция доступна только для администратора.
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	InfoLog.Printf("Body: %s", string(bodyData))
	var body ComplexesPostInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		ErrorLog.Printf("Error while parsing data: %s", err)
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("Request body: %+v", body)

	err = db.UpdateComplex(id, body.Id, body.Ip, body.Name)
	if err != nil {
		ErrorLog.Printf("Error while update complex: %s", err)
		http.Error(writer, fmt.Sprintf("Internal server error"), http.StatusInternalServerError)
		return
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

func ComplexesPutHandler(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("PUT /api/complexes handler for %s", vars["id"])

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(writer, fmt.Sprintf("Could not get complex id"), http.StatusBadRequest)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	//Проверить ключ доступа при обработке запроса POST api/complexes. Операция доступна только для администратора.
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	// InfoLog.Printf("Body: %s", string(bodyData))
	var body ComplexesPostInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	// InfoLog.Printf("Request body: %+v", body)

	err = db.AddComplex(id, body.Ip, body.Name)
	if err != nil {
		ErrorLog.Printf("Error while adding complex: %s", err)
		http.Error(writer, fmt.Sprintf("Internal server error"), http.StatusInternalServerError)
		return
	}

	var resp ComplexesPutHandlerResponse
	resp.Message = "Status OK"
	resp.Id = id
	resp.Ip = body.Ip
	resp.Name = body.Name
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func ComplexesDeleteHandler(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("DELETE /api/complexes handler for %s", vars["id"])

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(writer, fmt.Sprintf("Could not get complex id"), http.StatusBadRequest)
		return
	}

	//Проверить ключ доступа при обработке запроса POST api/complexes. Операция доступна только для администратора.
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	err = db.DeleteComplex(id)
	if err != nil {
		ErrorLog.Printf("Error while delete complex: %s", err)
		http.Error(writer, fmt.Sprintf("Internal server error"), http.StatusInternalServerError)
		return
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

func ComplexesGetHandler(writer http.ResponseWriter, request *http.Request) {
	//Проверить ключ доступа при обработке запроса POST api/complexes. Операция доступна для пользователя.
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, User)
	if !ok {
		ErrorLog.Printf("Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	//Получить список сконфигурированных комплексов
	dbComplexesInfo := db.GetComplexesInfo()

	//Получить данные об обмене с комплексами
	dsiComplexesInfo := data_source_interconnection.ComplexesStatisticMap
	// InfoLog.Printf("DB complexes info: %+v, len(%d)", dbComplexesInfo, len(dbComplexesInfo))
	// InfoLog.Printf("DSI complexes info: %+v, len(%d)", dsiComplexesInfo, len(dsiComplexesInfo))

	//Сформировать результат работы
	response := make([]ComplexInfo, 0)
	for _, dbInfo := range dbComplexesInfo {
		var item ComplexInfo
		item.Info = dbInfo
		// InfoLog.Printf("Processing: %d -> %+v", index, dbInfo)
		info, ok := dsiComplexesInfo[dbInfo.ID]
		// InfoLog.Printf("Found: %+v, %+v", info, ok)
		if ok {
			item.Statistic = info
		} else {
			item.Statistic = data_source_interconnection.ComplexStatistic{
				IsConnected:              false,
				LastDataReceiveTimestamp: 0,
			}
		}
		response = append(response, item)
	}

	// InfoLog.Printf("Response: %+v", response)
	jsonResp, err := json.Marshal(response)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
		http.Error(writer, "Error generating result info.", http.StatusInternalServerError)
		return
	}
	writer.Header().Set("Access-Control-Allow-Origin", "*")
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func GetComplexesConfigurationForUser(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	InfoLog.Printf("api::GetComplexesConfigrurationForUser GET /api/complexes/%s/configuration", id)

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
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
	writer.Header().Set("Access-Control-Allow-Origin", "*")
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func PostComplexesConfigurationForUser(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	InfoLog.Printf("api::PostComplexesConfigrurationForUser Post /api/complexes/%s/configuration", id)

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("api::PostComplexesConfigrurationForUser Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	var body map[string]int
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	// InfoLog.Printf("api::PostComplexesConfigrurationForUser Request body: %+v", body)

	err = db.UpdateComplexConfiguration(id, body)
	if err != nil {
		ErrorLog.Printf("api::PostComplexesConfigrurationForUser Error while updating complex configuration: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::PostComplexesConfigrurationForUser Error happened in JSON marshal. Err: %s", err)
	}
	// writer.Header().Set("Access-Control-Allow-Origin", "*")
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func AuthHandler(writer http.ResponseWriter, request *http.Request) {
	InfoLog.Printf("POST /api/auth handler")

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		makeRandomDelay()
		ErrorLog.Printf("AuthHandler: Error while read request body: %s", err)
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("Body: %s", string(bodyData))
	var body AuthInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		makeRandomDelay()
		ErrorLog.Printf("AuthHandler: Error while parsing data: %s", err)
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	res, userInfo := db.CheckUserCredencials(body.Login, body.Password)
	if !res.IsSuccess {
		makeRandomDelay()
		ErrorLog.Printf("AuthHandler: Error while checking creadentials: %s, %s", body.Login, body.Password)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	InfoLog.Printf("AuthHandler: Found user: %+v", userInfo)

	authInfo, err := CreateToken(userInfo)
	if err != nil {
		ErrorLog.Printf("Error generating token: %s", err)
		http.Error(writer, "Error generating token.", http.StatusInternalServerError)
		return
	}

	authRefreshInfo, err := CreateRefreshToken(userInfo)
	if err != nil {
		ErrorLog.Printf("Error generating refresh token: %s", err)
		http.Error(writer, "Error generating refresh token.", http.StatusInternalServerError)
		return
	}

	var response = AuthResponse{
		TokenInfo:        authInfo,
		RefreshTokenInfo: authRefreshInfo,
		Role:             userInfo.Role,
		ChangePassword:   userInfo.ChangePassword != 0,
		ID:               userInfo.ID,
		Name:             userInfo.Name,
	}

	jsonResp, err := json.Marshal(response)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
		http.Error(writer, "Error generating result info.", http.StatusInternalServerError)
		return
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UsersGet(writer http.ResponseWriter, request *http.Request) {
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UsersGet: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Admin)
	if !ok {
		ErrorLog.Printf("api::UsersGet: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	usersInfo, err := db.GetUsersInfo()
	if err != nil {
		ErrorLog.Printf("UsersGet: Error while get users info: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	// InfoLog.Printf("Response: %+v", response)

	jsonResp, err := json.Marshal(usersInfo)
	if err != nil {
		ErrorLog.Printf("UsersGet: Error happened in JSON marshal. Err: %s", err)
		http.Error(writer, "Error generating result info.", http.StatusInternalServerError)
		return
	}
	writer.Header().Set("Access-Control-Allow-Origin", "*")
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UserPut(writer http.ResponseWriter, request *http.Request) {
	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UsersPut: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Admin)
	if !ok {
		ErrorLog.Printf("api::UsersPut: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		ErrorLog.Printf("api::UsersPut: Body required")
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("api::UsersPut: Body: %s", string(bodyData))
	var body UsersInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		ErrorLog.Printf("api::UsersPut: Error while parsing data: %s", err)
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	_, err = StringToRole(body.Role)
	if err != nil {
		ErrorLog.Printf("api::UsersPut: Role not valid: %s", body.Role)
		http.Error(writer, fmt.Sprintf("Bad request"), http.StatusBadRequest)
		return
	}

	data := db.UsersData{ID: body.ID, Name: body.Name, Password: body.Password, Role: body.Role}
	err = db.AddUser(data)
	if err != nil {
		ErrorLog.Printf("api::UsersPut: Error while add users info: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	// InfoLog.Printf("Response: %+v", response)

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UserDelete(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("api::UserDelete DELETE /api/user handler for %s", vars["id"])

	id := vars["id"]

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UsersPut: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, tokenInfo := CheckToken(token, Admin)
	if !ok {
		ErrorLog.Printf("api::UserDelete: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if tokenInfo.id == id {
		ErrorLog.Printf("api::UserDelete: Trying to delete current user.")
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	err := db.DeleteUser(id)
	if err != nil {
		ErrorLog.Printf("api::UserDelete: Error while delete user: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::UserDelete: Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UserPost(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("api::UserPost POST /api/user handler for %s", vars["id"])

	id := vars["id"]

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UsersPost: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, tokenInfo := CheckToken(token, Admin)
	if !ok {
		ErrorLog.Printf("api::UserPost: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if tokenInfo.id == id {
		ErrorLog.Printf("api::UserPost: Trying to change current user.")
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		ErrorLog.Printf("api::UserPost: Body required")
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("api::UserPost: Body: %s", string(bodyData))
	var body UsersInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		ErrorLog.Printf("api::UserPost: Error while parsing data: %s", err)
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	data := db.UsersInfo{ID: id, Name: body.Name, Role: strings.ToLower(body.Role)}
	err = db.UpdateUser(data)
	if err != nil {
		ErrorLog.Printf("api::UserPost: Error while update user: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::UserPost: Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UserChangePasswordPost(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("api::UserChangePasswordPost POST /api/users/{id}/changePassword handler for %s", vars["id"])

	id := vars["id"]

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UserChangePasswordPost: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, tokenInfo := CheckToken(token, User)
	if !ok {
		ErrorLog.Printf("api::UserChangePasswordPost: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if tokenInfo.id != id {
		ErrorLog.Printf("api::UserChangePasswordPost: Trying to change not self password: %s != %s.", tokenInfo.id, id)
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	bodyData, err := ioutil.ReadAll(request.Body)
	if err != nil {
		ErrorLog.Printf("api::UserChangePasswordPost: Body required")
		http.Error(writer, fmt.Sprintf("Body required"), http.StatusBadRequest)
		return
	}

	InfoLog.Printf("api::UserChangePasswordPost: Body: %s", string(bodyData))
	var body UsersInfo
	err = json.NewDecoder(bytes.NewReader(bodyData)).Decode(&body)
	if err != nil {
		ErrorLog.Printf("api::UserChangePasswordPost: Error while parsing data: %s", err)
		http.Error(writer, fmt.Sprintf("Error while parsing data: %s", err), http.StatusBadRequest)
		return
	}

	data := db.UsersData{ID: id, Password: body.Password}
	err = db.ChangePassword(data)
	if err != nil {
		ErrorLog.Printf("api::UserChangePasswordPost: Error while change user password: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::UserChangePasswordPost: Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func UserResetPost(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	InfoLog.Printf("api::UserResetPost POST /api/user/{id}/reset handler for %s", vars["id"])

	id := vars["id"]

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, fmt.Sprintf("api::UserResetPost: Incorrect authorization header"), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, tokenInfo := CheckToken(token, Admin)
	if !ok {
		ErrorLog.Printf("api::UserResetPost: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if tokenInfo.id == id {
		ErrorLog.Printf("api::UserResetPost: Trying to reset self password.")
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	uuid := uuid.New()
	uuidString := uuid.String()
	uuidString = strings.ReplaceAll(uuidString, "-", "")
	pass := uuidString[:6]

	algorithm := sha1.New()
	algorithm.Write([]byte(pass))
	passHash := hex.EncodeToString(algorithm.Sum(nil))

	data := db.UsersData{ID: id, Password: passHash}
	err := db.ResetPassword(data)
	if err != nil {
		ErrorLog.Printf("api::UserResetPost: Error while change user password: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	resp := make(map[string]string)
	resp["message"] = "Status OK"
	resp["password"] = pass
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::UserResetPost: Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func SensorsDataGet(writer http.ResponseWriter, request *http.Request) {
	query := request.URL.Query()
	fromString, fromOk := query["from"]
	var fromInt int64
	var toInt int64
	if fromOk {
		fromInt, _ = strconv.ParseInt(fromString[0], 10, 64)
		if fromInt == 0 {
			fromInt = time.Now().AddDate(0, -1, 0).Unix()
		}
	} else {
		fromInt = time.Now().AddDate(0, -1, 0).Unix()
	}
	toString, toOk := query["to"]
	if toOk {
		toInt, _ = strconv.ParseInt(toString[0], 10, 64)
		if toInt == 0 {
			toInt = time.Now().Unix()
		}
	} else {
		toInt = time.Now().Unix()
	}
	InfoLog.Printf("api::SensorsDataGet GET /api/sensors/data handler from %d to %d", fromInt, toInt)

	if fromInt >= toInt {
		ErrorLog.Printf("api::SensorsDataGet From date is greater than to date")
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	authHeader := request.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(writer, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	token := strings.Replace(authHeader, "Bearer ", "", 1)
	ok, description, _ := CheckToken(token, Service)
	if !ok {
		ErrorLog.Printf("api::SensorsDataGet: Error while checking token: %s", description)
		http.Error(writer, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	data, err := db.GetSensorsData(fromInt, toInt)
	if err != nil {
		ErrorLog.Printf("api::SensorsDataGet: Error while get data from database: %s", err)
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	var resp SensorsDataResponse
	resp.Data = make([]SensorsDataItem, 0)

	for _, it := range data {
		resp.Data = append(resp.Data, SensorsDataItem{
			ComplexID: it.ComplexID,
			Type:      it.Type,
			Value:     it.Value,
			Timestamp: it.Timestamp,
		})
	}

	resp.Message = "Status OK"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		ErrorLog.Printf("api::SensorsDataGet: Error happened in JSON marshal. Err: %s", err)
	}
	writer.WriteHeader(http.StatusOK)
	writer.Write(jsonResp)
}

func makeRandomDelay() {
	if EnvParameters.LoginDelayMaxMillis <= 0 {
		return
	}
	r := rand.Intn(EnvParameters.LoginDelayMaxMillis)
	time.Sleep(time.Duration(r) * time.Millisecond)
}
