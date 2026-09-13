FROM rust:1.98-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY tests ./tests
COPY certs ./certs
COPY data ./data
RUN cargo build --release --locked --bin backend --bin healthcheck --bin refresh_worker --bin reminder_worker

FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/target/release/healthcheck ./healthcheck
COPY --from=builder /app/target/release/refresh_worker ./refresh_worker
COPY --from=builder /app/target/release/reminder_worker ./reminder_worker
EXPOSE 8080
CMD ["./backend"]
