import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface TextPart {
  type: 'text'
  text: string
}

export interface FilePart {
  type: 'file'
  mediaType: string
  url: string
  filename?: string
}

export type MessagePart = TextPart | FilePart

export interface Message {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
  loading?: boolean // true = waiting for first chunk (show dots)
  final?: boolean   // true = stream complete
}

export function newMessageId(): string {
  return `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function messageText(msg: Message): string {
  return msg.parts
    .filter((p): p is TextPart => p.type === 'text')
    .map(p => p.text)
    .join('')
}

const modalOpen = ref(false)
const initialQuery = ref('')

// Module-level: persists across component mount/unmount, survives modal close.
// On read (page reload), normalize: clear loading state and mark as final.
// Storage key bumped to v2 — legacy `lb-ai-chat` data is intentionally dropped.
const messages = useLocalStorage<Message[]>('lb-ai-chat-v2', [], {
  serializer: {
    read: (raw) => {
      try {
        const parsed = JSON.parse(raw) as Message[]
        return parsed.map(m => ({ ...m, loading: false, final: true }))
      } catch {
        return []
      }
    },
    write: (val) => JSON.stringify(val),
  },
})

export function useAIModal() {
  function openAIModal(query?: string) {
    initialQuery.value = query ?? ''
    modalOpen.value = true
  }

  function toggleAIModal() {
    modalOpen.value = !modalOpen.value
  }

  function clearMessages() {
    messages.value = []
  }

  return { modalOpen, initialQuery, openAIModal, toggleAIModal, messages, clearMessages }
}
