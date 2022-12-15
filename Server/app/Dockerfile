# The base go-image
FROM golang:1.16-alpine
 
# Create a directory for the app
RUN mkdir /build
 
# Copy all files from the current directory to the app directory
COPY * /build
 
# Set working directory
WORKDIR /build
 
# Run command as described:
# go build will build an executable file named server in the current directory
RUN go build -o server main
 
# Run the server executable
CMD [ "/build/server" ]