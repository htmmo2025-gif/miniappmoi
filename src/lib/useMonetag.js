// Simple helper cho Vue 3
import { ref } from 'vue'

export function useMonetag() {
  const ready = ref(false)
  const loading = ref(false)

  const preload = async (ymid = '') => {
    loading.value = true
    try {
      await window.monetagShow?.({ type: 'preload', ymid })
      ready.value = true
    } catch (e) {
      ready.value = false
      throw e
    } finally {
      loading.value = false
    }
  }

  const show = async (ymid = '') => {
    if (!window.monetagShow) throw new Error('Monetag SDK chưa sẵn sàng')
    return window.monetagShow({ ymid })
  }

  return { ready, loading, preload, show }
}
