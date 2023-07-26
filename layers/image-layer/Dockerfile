# BASE
FROM amazonlinux:2.0.20230628.0 AS base

RUN yum -y install gzip tar zip
RUN yum install -y gcc-c++ make
RUN touch ~/.bashrc
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
RUN source ~/.bashrc && nvm install 18.17.0
RUN yum update
RUN yum upgrade

# BUILD
FROM base AS build

WORKDIR /app

# Install dependenciess.
COPY nodejs/package*.json ./
RUN source ~/.bashrc && npm install

# Build artifacts.
COPY . .
RUN source ~/.bashrc && npm run build

# APPLICATION
FROM base AS applicaion

WORKDIR /app

# Install runtime dependencies only.
COPY --from=build /app/package*.json ./
RUN source ~/.bashrc && npm install --only=production

# Copy build artifacts only.
COPY --from=build /app/dist ./

# Package artifacts with dependencies.
RUN zip -r function.zip .