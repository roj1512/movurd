FROM nimlang/nim

COPY . /app
WORKDIR /app

RUN nimble install -Y
RUN nimble compile src/movurd.nim

CMD ["/app/src/movurd", "/app/tweets.txt"]
