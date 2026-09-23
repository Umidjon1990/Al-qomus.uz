FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY sarf/requirements.txt sarf/requirements.txt
RUN python3 -m venv /opt/sarf && /opt/sarf/bin/pip install --no-cache-dir -r sarf/requirements.txt
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN /opt/sarf/bin/python sarf/build.py && npm run check && node --import tsx script/build.ts

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PYTHON=/opt/sarf/bin/python
RUN apt-get update && apt-get install -y --no-install-recommends python3 fonts-dejavu-core fonts-hosny-amiri fonts-liberation2 libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 && rm -rf /var/lib/apt/lists/*
COPY --from=build /opt/sarf /opt/sarf
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/sarf ./sarf
COPY --from=build /app/data/sarf ./data/sarf
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", "dist/index.cjs"]
