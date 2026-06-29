FROM node:20-slim

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Run the dev server
CMD ["npm", "run", "dev"]
