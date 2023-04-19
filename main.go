package main

import (
	"database/sql"
	"encoding/base64"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"sync"

	sqlite3 "github.com/mattn/go-sqlite3"
	"github.com/mb-14/gomarkov"
)

var db *sql.DB

func initializeDB() error {
	_, err := db.Exec("CREATE TABLE IF NOT EXISTS generated_texts (text text NOT NULL, UNIQUE (text));")
	return err
}

func canReturn(text string) (bool, error) {
	text = base64.StdEncoding.EncodeToString([]byte(text))

	transaction, err := db.Begin()
	if err != nil {
		return false, err
	}

	_, err = transaction.Exec("INSERT INTO generated_texts (text) VALUES (?);", text)
	if err != nil {
		defer transaction.Rollback()
		error, ok := err.(sqlite3.Error)
		if ok && error.Code == sqlite3.ErrConstraint {
			return false, nil
		} else {
			return false, err
		}
	}

	defer transaction.Commit()
	return true, nil
}

func main() {
	var err error
	if db, err = sql.Open("sqlite3", "movurd.db"); err != nil {
		panic(err)
	}
	defer db.Close()

	if err = initializeDB(); err != nil {
		panic(err)
	}

	chain := gomarkov.NewChain(1)
	filename := "tweets.txt"
	if len(os.Args) > 1 {
		filename = os.Args[1]
	}
	bytes, _ := ioutil.ReadFile(filename)
	lines := strings.Split(string(bytes), "\n")
	for i := range lines {
		chain.Add(strings.Split(lines[i], " "))
	}

	mutex := &sync.Mutex{}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		mutex.Lock()
		defer mutex.Unlock()

		slices := []string{gomarkov.StartToken}
		for slices[len(slices)-1] != gomarkov.EndToken {
			next, _ := chain.Generate(slices[(len(slices) - 1):])
			slices = append(slices, next)
		}

		text := strings.Join(slices[1:len(slices)-1], " ")
		if ok, err := canReturn(text); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
		} else {
			if ok {
				w.Header().Set("Content-Type", "text/plain; charset=utf-8")
				w.Write([]byte(text))
			} else {
				w.WriteHeader(http.StatusNotFound)
			}
		}
	})

	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
