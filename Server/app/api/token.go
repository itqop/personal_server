package api

import (
	"fmt"
	"main/db"
	"time"

	"github.com/golang-jwt/jwt"
)

var signedStringKey = []byte("find_out_where_to_save_the_secret")

type TokenInfo struct {
	role      string
	name      string
	id        string
	issuedAt  int64
	expiresAt int64
}

func CreateToken(userInfo db.CheckUserCredencialsResult) (AuthResult, error) {
	return createTokenWithExpiration(userInfo, 24)
}

func CreateRefreshToken(userInfo db.CheckUserCredencialsResult) (AuthResult, error) {
	return createTokenWithExpiration(userInfo, 72)
}

func CheckToken(tokenString string, minRole Role) (bool, string, TokenInfo) {
	// InfoLog.Printf("api::CheckTocken ENTER(token = '%s', minRole = '%s')", tokenString, minRole.String())
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return false, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return signedStringKey, nil
	})
	if err != nil {
		ErrorLog.Printf("Error while parsing token: %s", err)
		return false, "Token parsing error", TokenInfo{}
	}

	var user string
	var id string
	var role string
	var expiresAt int64
	var issuedAt int64

	claims, ok := token.Claims.(jwt.MapClaims)
	if ok && token.Valid {
		user = claims["User"].(string)
		id = claims["ID"].(string)
		role = claims["Role"].(string)
		expiresAt = int64(claims["ExpiresAt"].(float64))
		issuedAt = int64(claims["IssuedAt"].(float64))

		// infoLog.Printf("Check token. User: %s,\nId: %s\n, Role: %s\n, Expires: %d\n, Issued: %d", user, id, role, expiresAt, issuedAt)
	} else {
		ErrorLog.Printf("Error while token validation: %s", err)
		return false, "Token not valid", TokenInfo{}
	}

	tokeInfo := TokenInfo{
		name:      user,
		id:        id,
		role:      role,
		expiresAt: expiresAt,
		issuedAt:  issuedAt,
	}

	//Check expiration
	nowUnix := time.Now().Unix()
	if nowUnix < issuedAt || nowUnix > expiresAt {
		ErrorLog.Printf("Check token. Token expired or incorrect (issued <= token <= expired): %d <= %d <= %d", issuedAt, nowUnix, expiresAt)
		return false, "Token expired or incorrect", tokeInfo
	}

	//Check role
	tokenRole, _ := StringToRole(role)
	if tokenRole < minRole {
		ErrorLog.Printf("Check token. The method could not be executed with role '%s'", role)
		return false, "Wrong role", tokeInfo
	}

	return true, "OK", tokeInfo
}

func createTokenWithExpiration(userInfo db.CheckUserCredencialsResult, hoursToExpire int) (AuthResult, error) {
	var res AuthResult
	now := time.Now()
	res.ExpiresAt = now.Add(time.Hour * time.Duration(hoursToExpire)).Unix()
	res.IssuedAt = now.Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"User":      userInfo.Name,
		"ID":        userInfo.ID,
		"Role":      userInfo.Role,
		"ExpiresAt": res.ExpiresAt,
		"IssuedAt":  res.IssuedAt,
	})
	tokenString, err := token.SignedString(signedStringKey)
	res.Token = tokenString
	res.AuthType = "Bearer"
	return res, err
}
