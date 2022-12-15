package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type ComplexesInfo struct {
	ID   int
	Name string
	Ip   string
}

type RequestResult struct {
	IsSuccess   bool
	Description string
}

type CheckUserCredencialsResult struct {
	ID             string
	Name           string
	Role           string
	ChangePassword int
}

type UsersInfo struct {
	ID   string
	Name string
	Role string
}

type UsersData struct {
	ID       string
	Name     string
	Role     string
	Password string
}

type SensorData struct {
	ID        int
	ComplexID int
	Type      string
	Value     float64
	Timestamp int64
}

type environment struct {
	database     *sql.DB
	cancelFunc   context.CancelFunc
	complexesMap map[int]ComplexesInfo
}

var infoLog *log.Logger
var errorLog *log.Logger
var env = &environment{}

func Run(ctx context.Context, cancel context.CancelFunc) {
	infoLog = log.New(os.Stdout, "INFO (db)\t", log.Ldate|log.Ltime|log.Lshortfile)
	errorLog = log.New(os.Stderr, "ERROR (db)\t", log.Ldate|log.Ltime|log.Lshortfile)

	env.cancelFunc = cancel

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_DB")

	dbConfigurationString := fmt.Sprintf("%s:%s@tcp(host.docker.internal:3306)/%s", dbUser, dbPassword, dbName)
	database, err := sql.Open("mysql", dbConfigurationString)
	if err != nil {
		errorLog.Printf("Error while opening (connecting to) database: %s", err)
	}
	env.database = database

	database.SetConnMaxLifetime(time.Second)
	database.SetMaxOpenConns(10)
	database.SetMaxIdleConns(0)

	pingErr := database.Ping()
	if pingErr != nil {
		errorLog.Printf("Error while pinging database: %s", pingErr)
	} else {
		infoLog.Println("Connected to database")
	}

	database.Exec("SET NAMES 'utf8mb4';")
	database.Exec("SET CHARACTER SET utf8mb4;")

	Migrate()

	env.complexesMap = make(map[int]ComplexesInfo)
	initComplexesInfo()
}

func Stop() {
	if env.database != nil {
		env.database.Close()
	}
}

func CheckComplex(id int, ip string) (bool, string) {
	infoLog.Printf("Check complex id (%d), ip (%s)", id, ip)
	info, ok := env.complexesMap[id]
	if !ok {
		return false, fmt.Sprintf("Unable to find specified id: %d", id)
	}
	if ip != info.Ip {
		return false, fmt.Sprintf("Complex has wrong ip")
	}
	return true, "OK"
}

func UpdateComplex(sourceId int, id int, ip string, name string) error {
	infoLog.Printf("Update complex %d: {id: %d, ip: %s, name: %s}", sourceId, id, ip, name)

	info, ok := env.complexesMap[sourceId]
	if !ok {
		return fmt.Errorf("Unknown id.")
	}

	if ip != "" {
		info.Ip = ip
	}
	if name != "" {
		info.Name = name
	}
	if id != 0 {
		info.ID = id
	}
	if id != 0 && sourceId != id {
		delete(env.complexesMap, sourceId)
	}
	env.complexesMap[id] = info

	var err error
	var ipPart = ""
	var namePart = ""
	var idPart = ""
	if ip != "" {
		ipPart = fmt.Sprintf("ip=\"%s\"", info.Ip)
	}
	if name != "" {
		namePart = fmt.Sprintf("name=\"%s\"", info.Name)
	}
	if id != 0 && sourceId != id {
		idPart = fmt.Sprintf("id=\"%d\"", info.ID)
	}
	parts := [...]string{ipPart, namePart, idPart}
	var filteredParts []string
	for _, part := range parts {
		if part != "" {
			filteredParts = append(filteredParts, part)
		}
	}
	partsJoin := strings.Join(filteredParts[:], ",")
	_, err = env.database.Exec(fmt.Sprintf("UPDATE complexes SET %s WHERE id=\"%d\";", partsJoin, sourceId))
	if err != nil {
		return fmt.Errorf("Error while updating database: %s", err)
	}

	return nil
}

func AddComplex(id int, ip string, name string) error {
	infoLog.Printf("Add complex: {id: %d, ip: %s, name: %s}", id, ip, name)

	var err error
	_, err = env.database.Exec(fmt.Sprintf("INSERT INTO complexes(id, name, ip) VALUES (%d, \"%s\", \"%s\");", id, name, ip))
	if err != nil {
		return fmt.Errorf("Error while updating database: %s", err)
	}
	env.complexesMap[id] = ComplexesInfo{
		ID:   id,
		Name: name,
		Ip:   ip,
	}
	return nil
}

func DeleteComplex(id int) error {
	infoLog.Printf("Delete complex: {id: %d}", id)

	var err error
	_, err = env.database.Exec(fmt.Sprintf("DELETE FROM complexes WHERE id = %d", id))
	if err != nil {
		return fmt.Errorf("Error while delete complex: %s", err)
	}
	delete(env.complexesMap, id)
	return nil
}

func CheckUserCredencials(login string, password string) (RequestResult, CheckUserCredencialsResult) {
	infoLog.Printf("Check user credentials for '%s'", login)

	var userResult CheckUserCredencialsResult
	request := fmt.Sprintf("SELECT id, name, role, changePassword FROM users WHERE name = '%s' AND password = '%s'", login, password)
	err := env.database.QueryRow(request).Scan(&userResult.ID, &userResult.Name, &userResult.Role, &userResult.ChangePassword)
	if err != nil {
		return RequestResult{IsSuccess: false, Description: err.Error()}, userResult
	}

	return RequestResult{IsSuccess: true, Description: "OK"}, userResult
}

func AddSensorData(complexID int, dataType string, value float64, timestamp int64) error {
	timestampString := time.Unix(timestamp, 0).Format("2006-01-02 15:04:05")
	request := fmt.Sprintf("INSERT INTO sensorData (complexID, type, value, timestamp) VALUES(%d, '%s', %f, '%s');", complexID, dataType, value, timestampString)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while adding sensor data: %s", err)
	}

	request = fmt.Sprintf("INSERT IGNORE INTO complexesConfiguration SET complexID=%d, sensorType='%s', updatePeriod=0", complexID, dataType)
	_, err = env.database.Exec(request)
	if err != nil {
		errorLog.Printf("Error while adding sensor data: %s", err)
	}

	return nil
}

func GetComplexesInfo() map[int]ComplexesInfo {
	return env.complexesMap
}

func GetUsersInfo() ([]UsersInfo, error) {
	res, err := env.database.Query("SELECT id,name,role FROM users;")
	defer res.Close()
	if err != nil {
		return nil, fmt.Errorf("GetUsersInfo: error while query users: %s", err)
	}

	result := make([]UsersInfo, 0)
	for res.Next() {
		var item UsersInfo
		err := res.Scan(&item.ID, &item.Name, &item.Role)
		if err != nil {
			errorLog.Printf("GetUsersInfo: error while scanning users info item: %s", err)
			continue
		}
		result = append(result, item)
	}
	return result, nil
}

func AddUser(user UsersData) error {
	request := fmt.Sprintf("INSERT INTO users (id, name, password, role, changePassword) VALUES(uuid(), '%s', '%s', '%s', 1);", user.Name, user.Password, user.Role)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while adding new user: %s", err)
	}
	return nil
}

func DeleteUser(id string) error {
	request := fmt.Sprintf("DELETE FROM users WHERE id='%s';", id)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while deleting user: %s", err)
	}
	return nil
}

func UpdateUser(user UsersInfo) error {
	request := fmt.Sprintf("UPDATE users SET name='%s', role='%s' WHERE id='%s';", user.Name, user.Role, user.ID)
	// infoLog.Printf("db::UpdateUser request %s", request)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while updating user: %s", err)
	}
	return nil
}

func ChangePassword(user UsersData) error {
	request := fmt.Sprintf("UPDATE users SET password='%s', changePassword=0 WHERE id='%s';", user.Password, user.ID)
	// infoLog.Printf("db::ChangePassword request %s", request)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while changing password: %s", err)
	}
	return nil
}

func ResetPassword(user UsersData) error {
	request := fmt.Sprintf("UPDATE users SET password='%s', changePassword=1 WHERE id='%s';", user.Password, user.ID)
	// infoLog.Printf("db::ResetPassword request %s", request)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while reseting password: %s", err)
	}
	return nil
}

func GetSensorsData(from int64, to int64) ([]SensorData, error) {
	fromString := time.Unix(from, 0).Format("2006-01-02 15:04:05")
	toString := time.Unix(to, 0).Format("2006-01-02 15:04:05")
	query := fmt.Sprintf("SELECT id, complexID, type, value, timestamp FROM sensorData WHERE timestamp >= '%s' AND timestamp <= '%s';", fromString, toString)
	infoLog.Printf("db::GetSensorsData Query: %s", query)
	res, err := env.database.Query(query)
	defer res.Close()
	if err != nil {
		return nil, fmt.Errorf("db::GetSensorsData Error while query: %s", err)
	}

	sensorsData := make([]SensorData, 0)
	for res.Next() {
		var info SensorData
		var timestampString string
		err := res.Scan(&info.ID, &info.ComplexID, &info.Type, &info.Value, &timestampString)
		if err != nil {
			errorLog.Printf("db::GetSensorsData Error while scanning parameters from response: %s", err)
			continue
		}
		timestamp, _ := time.Parse("2006-01-02 15:04:05", timestampString)
		info.Timestamp = timestamp.Unix()
		sensorsData = append(sensorsData, info)
	}

	// infoLog.Printf("db::GetSensorsData %+v", sensorsData)

	return sensorsData, nil
}

func RemoveOldDataFromSensorsDatabase(daysOld int) error {
	if daysOld <= 0 {
		return fmt.Errorf("Could not delete data in future")
	}

	request := fmt.Sprintf("DELETE FROM sensorData WHERE timestamp < NOW() - INTERVAL %d DAY;", daysOld)
	// infoLog.Printf("db::RemoveOldDataFromSensorsDatabase request %s", request)
	_, err := env.database.Exec(request)
	if err != nil {
		return fmt.Errorf("Error while delete old data: %s", err)
	}
	return nil
}

func GetComplexConfiguration(id string) (map[string]int, error) {
	query := fmt.Sprintf("SELECT sensorType, updatePeriod FROM complexesConfiguration WHERE complexID='%s';", id)
	infoLog.Printf("db::GetComplexConfiguration Query: %s", query)
	res, err := env.database.Query(query)
	defer res.Close()
	if err != nil {
		return nil, fmt.Errorf("db::GetComplexConfiguration Error while query: %s", err)
	}

	response := make(map[string]int)
	for res.Next() {
		var sensorType string
		var updatePeriod int
		err := res.Scan(&sensorType, &updatePeriod)
		if err != nil {
			errorLog.Printf("db::GetComplexConfiguration Error while scanning parameters from response: %s", err)
			continue
		}
		response[sensorType] = updatePeriod
	}
	return response, nil
}

func UpdateComplexConfiguration(id string, data map[string]int) error {
	for key, value := range data {
		request := fmt.Sprintf("UPDATE complexesConfiguration SET updatePeriod=%d WHERE complexID='%s' AND sensorType='%s';", value, id, key)
		_, err := env.database.Exec(request)
		if err != nil {
			errorLog.Printf("db::UpdateComplexConfiguration Error while update complex configuration: %s", err)
			continue
		}
	}
	return nil
}

func initComplexesInfo() error {
	res, err := env.database.Query("SELECT id,name,ip FROM complexes;")
	defer res.Close()
	if err != nil {
		return fmt.Errorf("Init complexes info error: %s", err)
	}

	for res.Next() {
		var info ComplexesInfo
		err := res.Scan(&info.ID, &info.Name, &info.Ip)
		if err != nil {
			errorLog.Printf("Error while scanning parameters from response: %s", err)
			continue
		}
		env.complexesMap[info.ID] = info
	}

	infoLog.Printf("Complexes info initialized success. Have %d complexes.", len(env.complexesMap))
	return nil
}
