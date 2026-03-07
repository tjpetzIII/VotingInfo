use std::net::TcpStream;

fn main() {
    match TcpStream::connect("127.0.0.1:8080") {
        Ok(_) => std::process::exit(0),
        Err(_) => std::process::exit(1),
    }
}
