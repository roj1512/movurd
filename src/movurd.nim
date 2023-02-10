import md5
import options
import strutils
import std/with
import nimkov/[generator, typedefs, validators]
import norm/[model, pragmas, sqlite]
import httpbeast
import asyncdispatch

type
    GeneratedText* {.tableName: "generated_texts".} = ref object of Model
        text* {.unique.}: string


func newGeneratedText(text = ""): GeneratedText =
    GeneratedText(text: text)


proc getHandler(markov: MarkovGenerator, dbConn: DbConn): OnRequest =
    return proc(req: Request): Future[void] {.gcsafe.} =
        let options = MarkovGenerateOptions(attempts: 10000,
                validator: defaultValidator());
        let text = markov.generate(options).get

        var generatedText = newGeneratedText($toMD5(text))

        try:
            with dbConn:
                insert generatedText
        except DbError as e:
            if "UNIQUE constraint failed" in e.msg:
                echo "duplicate"
                req.send(Http404)
                return
            else:
                raise

        req.send(Http200, text, "Content-Type: text/plain; charset=UTF-8")

when isMainModule:
    var file = open("tweets.txt")
    let phrases = file.readAll().split("\n")
    file.close()
    let markov = newMarkov(phrases)

    let dbConn = open("movurd.db", "", "", "")
    dbConn.createTables(newGeneratedText())

    run(getHandler(markov, dbConn), initSettings(numThreads = 1))
