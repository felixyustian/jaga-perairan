// RUTE HIJAU API gateway.
// Thin reverse proxy in front of the Python routing service. Adds a health
// endpoint, permissive CORS for the Vercel demo frontend, and request logging.
// Target service is configured via SERVICE_URL (default http://service:8000).
package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"time"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	target := env("SERVICE_URL", "http://service:8000")
	u, err := url.Parse(target)
	if err != nil {
		log.Fatalf("bad SERVICE_URL %q: %v", target, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(u)

	mux := http.NewServeMux()
	mux.HandleFunc("/gateway/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","component":"gateway"}`))
	})
	mux.Handle("/", proxy)

	addr := ":" + env("PORT", "8080")
	log.Printf("gateway listening on %s -> %s", addr, target)
	log.Fatal(http.ListenAndServe(addr, withCORS(mux)))
}
