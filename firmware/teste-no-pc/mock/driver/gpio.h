#pragma once
typedef int gpio_num_t;
inline int gpio_set_level(gpio_num_t p, uint32_t v) { sim::pinos[p] = (int)v; return 0; }
