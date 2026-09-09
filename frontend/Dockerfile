FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=secret,id=frontend_env,target=/app/.env.local,required=true yarn build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
