# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.10.0

# Create a stage for compiling Typescript files to vanilla JS.
FROM node:${NODE_VERSION}-alpine AS compile

# Use production node environment by default.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --fund=false

# Copy the rest of the source files into the image.
# DO this with a mount instead
RUN --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=epilogue/src,target=epilogue/src \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm run build-epilogue

# Create a stage for running the production application.
FROM node:${NODE_VERSION}-alpine AS final

# Use production node environment by default.
ENV NODE_ENV=production

WORKDIR /usr/landscape

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Run the application as a non-root user.
## *** Will the user have permission to edit the file??? ****
USER node

# Copy the rest of the source files into the image, plus
# explicitly rename the server js so it's recognized by node as
# a module. Compiling with ESM is necessary since tiny-http is an ESM-only
# library and needs to be compiled as such.
COPY --from=compile /usr/src/app/epilogue/dist/server.js ./server.mjs

# Expose the port that the application listens on.
EXPOSE 4001

# Run the application.
CMD ["node", "./server.mjs"]
