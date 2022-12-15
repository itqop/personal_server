package db

import (
	"fmt"
	"strconv"
)

const currentDBVersion = 8

type Migration struct {
	version int
	up      []string
	down    []string
}

func Migrate() {
	dbVersion := 0
	res, err := env.database.Query("SELECT value FROM configuration WHERE field = 'version'")
	if err != nil {
		dbVersion = 0
	} else {
		defer res.Close()

		var versionString string
		if res.Next() {
			err = res.Scan(&versionString)
			if err != nil {
				dbVersion = 0
				errorLog.Printf("Migration: Unable to get current version for database: %s", err)
				return
			}
			dbVersion, err = strconv.Atoi(versionString)
			if err != nil {
				errorLog.Printf("Migration: Wrong data in configutaion table: %s", err)
				return
			}
		} else {
			dbVersion = 0
		}
	}
	if currentDBVersion == dbVersion {
		infoLog.Printf("Migration not needed. Current version is '%d'", currentDBVersion)
	} else {
		migrate(dbVersion, currentDBVersion)
	}
}

func migrate(from int, to int) error {
	var details string
	if from < to {
		details = "upgrade"
	} else {
		details = "downgrade"
	}
	infoLog.Printf("Migration started. %d -> %d (%s)", from, to, details)

	if from < to {
		for i := from; i < to; i++ {
			info, ok := migrationInfo[i]
			if !ok {
				continue
			}
			for _, command := range info.up {
				infoLog.Printf("Migration (%d): %s", i, command)
				_, err := env.database.Exec(command)
				if err != nil {
					errorLog.Printf("Migration failed. Step '%d','%s': %s", i, command, err)
					return err
				}
			}
		}
	} else {
		for i := to; i > from; i-- {
			info, ok := migrationInfo[i]
			if !ok {
				continue
			}
			for _, command := range info.down {
				infoLog.Printf("Migration (%d): %s", i, command)
				_, err := env.database.Exec(command)
				if err != nil {
					errorLog.Printf("Migration failed. Step '%d','%s': %s", i, command, err)
					return err
				}
			}
		}
	}

	command := fmt.Sprintf("INSERT INTO configuration (field, value) VALUES( 'version', %d) ON DUPLICATE KEY UPDATE field='version', value=%d;", to, to)
	_, err := env.database.Exec(command)
	if err != nil {
		errorLog.Printf("Migration failed. Error while version update: %s", err)
		return err
	}
	infoLog.Printf("Migration succeeded.")
	return nil
}
