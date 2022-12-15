package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"main/data_source_interconnection"
	"main/db"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

var InfoLog *log.Logger
var ErrorLog *log.Logger

type requestHandler func(http.ResponseWriter, *http.Request)

type ComplexesPostInfo struct {
	Ip   string
	Name string
	Id   int
}

type AuthInfo struct {
	Login    string
	Password string
}

type AuthResult struct {
	Token     string
	ExpiresAt int64
	IssuedAt  int64
	AuthType  string
}

type AuthResponse struct {
	TokenInfo        AuthResult
	RefreshTokenInfo AuthResult
	Role             string
	ChangePassword   bool
	ID               string
	Name             string
}

type ComplexInfo struct {
	Info      db.ComplexesInfo
	Statistic data_source_interconnection.ComplexStatistic
}

type UsersInfo struct {
	ID       string
	Name     string
	Password string
	Role     string
}

type SensorsDataItem struct {
	ComplexID int
	Type      string
	Value     float64
	Timestamp int64
}

type SensorsDataResponse struct {
	Data    []SensorsDataItem
	Message string
	//@todo
}

type EnvironmentParameters struct {
	DaysToSaveSensorsData int
	LoginDelayMaxMillis   int
}

type GetComplexesConfigrurationResponse struct {
	Configuration map[string]int
	Message       string
}

type Role int16

var EnvParameters EnvironmentParameters = EnvironmentParameters{}

const (
	Unknown Role = iota
	User
	Service
	Admin
)

func (role Role) String() string {
	switch role {
	case User:
		return "User"
	case Service:
		return "Service"
	case Admin:
		return "Admin"
	}
	return "Unknown"
}

func Run(ctx context.Context, cancel context.CancelFunc) {
	InfoLog = log.New(os.Stdout, "INFO (api)\t", log.Ldate|log.Ltime|log.Lshortfile)
	ErrorLog = log.New(os.Stderr, "ERROR (api))\t", log.Ldate|log.Ltime|log.Lshortfile)

	go initHTTPServer(cancel)
	go initHTTPSServer(cancel)
}

func StringToRole(s string) (Role, error) {
	switch strings.ToLower(s) {
	case "user":
		return User, nil
	case "service":
		return Service, nil
	case "admin":
		return Admin, nil
	}
	return Unknown, fmt.Errorf("Unknown role '%s'", s)
}

func initHTTPServer(cancel context.CancelFunc) {
	InfoLog.Printf("Initialising http server...")

	days_to_save_sensors_data := os.Getenv("DAYS_TO_SAVE_SENSORSDATA")
	daysToSaveSensorsData, err := strconv.Atoi(days_to_save_sensors_data)
	if err != nil {
		EnvParameters.DaysToSaveSensorsData = -1
	}
	EnvParameters.DaysToSaveSensorsData = daysToSaveSensorsData

	login_delay_max_millis := os.Getenv("LOGIN_DELAY_MAX_MILLIS")
	loginDelayMaxMillis, err := strconv.Atoi(login_delay_max_millis)
	if err != nil {
		EnvParameters.LoginDelayMaxMillis = 0
	}
	EnvParameters.LoginDelayMaxMillis = loginDelayMaxMillis

	InfoLog.Printf("Environment parameters: %+v", EnvParameters)

	router := mux.NewRouter()
	router.HandleFunc("/api/auth", AuthHandler).Methods(http.MethodPost)
	router.HandleFunc("/api/complexes", ComplexesGetHandler).Methods(http.MethodGet)
	router.HandleFunc("/api/complexes/{id}", ComplexesPostHandler).Methods(http.MethodPost)
	router.HandleFunc("/api/complexes/{id}", ComplexesPutHandler).Methods(http.MethodPut)
	router.HandleFunc("/api/complexes/{id}", ComplexesDeleteHandler).Methods(http.MethodDelete)
	router.HandleFunc("/api/complexes/{id}/configuration", GetComplexesConfigurationForUser).Methods(http.MethodGet)
	router.HandleFunc("/api/complexes/{id}/configuration", PostComplexesConfigurationForUser).Methods(http.MethodPost)
	router.HandleFunc("/api/users", UsersGet).Methods(http.MethodGet)
	router.HandleFunc("/api/users", UserPut).Methods(http.MethodPut)
	router.HandleFunc("/api/users/{id}", UserDelete).Methods(http.MethodDelete)
	router.HandleFunc("/api/users/{id}", UserPost).Methods(http.MethodPost)
	router.HandleFunc("/api/users/{id}/changePassword", UserChangePasswordPost).Methods(http.MethodPost)
	router.HandleFunc("/api/users/{id}/reset", UserResetPost).Methods(http.MethodPost)
	router.HandleFunc("/api/sensors/data", SensorsDataGet).Methods(http.MethodGet)

	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{
			http.MethodPost,
			http.MethodGet,
			http.MethodPut,
			http.MethodDelete,
		},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
	}).Handler(router)

	server := http.Server{
		Addr:    ":50001",
		Handler: handler,
	}

	if err := server.ListenAndServe(); err != nil {
		if !errors.Is(err, http.ErrServerClosed) {
			ErrorLog.Printf("error running http server: %s\n", err)
			cancel()
		}
	}
}

func initHTTPSServer(cancel context.CancelFunc) {
	InfoLog.Printf("Initialising https server...")
	listenAddr := os.Getenv("LISTEN_ADDR")
	if len(listenAddr) == 0 {
		listenAddr = ":8081"
	}

	InfoLog.Printf("Listen addres/port: %s", listenAddr)

	router := mux.NewRouter()
	router.HandleFunc("/api/sensors/data", NewSensorsDataPost).Methods(http.MethodPost)
	router.HandleFunc("/api/complexes/{id}/configuration", GetComplexesConfigruration).Methods(http.MethodGet)

	server := http.Server{
		Addr:    listenAddr,
		Handler: router,
	}

	err := server.ListenAndServeTLS("cert.pem", "key.pem")
	if err != nil {
		ErrorLog.Printf("Error while initialising HTTPS server: %s", err)
		cancel()
	}
}
