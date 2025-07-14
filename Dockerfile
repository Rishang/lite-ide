# Build stage for UI
FROM node:18-alpine AS ui-builder
WORKDIR /app/ui
COPY ui/package.json ui/pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY ui/ .
RUN pnpm build

# Build stage for Go
FROM golang:1.22-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy built UI files
COPY --from=ui-builder /app/ui/out ./ui/out
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o boxy-ide ./src/cmd/server

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=go-builder /app/boxy-ide .
EXPOSE 3000
ENTRYPOINT ["./boxy-ide"] 