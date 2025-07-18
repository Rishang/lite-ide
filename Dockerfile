# Build stage for UI
FROM node:22-alpine AS ui-builder
WORKDIR /app/ui
COPY ui/package.json ui/pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY ui/ .
RUN pnpm build

# Build stage for Go
FROM golang:1.24-alpine AS go-builder
RUN apk add --no-cache curl && sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
WORKDIR /app
RUN mkdir src
COPY src/go.mod src/go.sum ./src
RUN cd src && go mod download
COPY src/ ./src
COPY Taskfile.yml ./
# Copy built UI files
COPY --from=ui-builder /app/ui/out ./ui/out
RUN task go:build

# Final stage
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y ca-certificates zsh curl git
WORKDIR /root/
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && chsh -s /bin/zsh
COPY --from=go-builder /app/build/ide /usr/local/bin/ide
EXPOSE 3000
ENTRYPOINT ["zsh"]
