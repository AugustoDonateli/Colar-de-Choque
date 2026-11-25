#pragma once
typedef void (*esp_timer_cb_t)(void*);
typedef enum { ESP_TIMER_TASK } esp_timer_dispatch_t;
typedef struct { esp_timer_cb_t callback; void* arg; esp_timer_dispatch_t dispatch_method; const char* name; bool skip_unhandled_events; } esp_timer_create_args_t;
struct sim_timer { esp_timer_cb_t cb; void* arg; bool ativo; uint64_t prazoUs; };
typedef sim_timer* esp_timer_handle_t;
namespace sim { extern sim_timer timer; extern int timersCriados; }
inline int esp_timer_create(const esp_timer_create_args_t* a, esp_timer_handle_t* h) { sim::timer.cb = a->callback; sim::timer.arg = a->arg; sim::timer.ativo = false; *h = &sim::timer; sim::timersCriados++; return 0; }
inline int esp_timer_start_once(esp_timer_handle_t h, uint64_t us) { h->ativo = true; h->prazoUs = (uint64_t)sim::agora * 1000ULL + us; return 0; }
inline int esp_timer_stop(esp_timer_handle_t h) { h->ativo = false; return 0; }
