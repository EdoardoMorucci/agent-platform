# docker/Dockerfile
FROM node:22-slim

# Install claude CLI
RUN npm install -g @anthropic-ai/claude-code

# Default working directory (overridden by bind mount at runtime)
WORKDIR /workspace

CMD ["claude"]
