<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  heroes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'watch-battle', 'refresh-request'])

const activeTab = ref('heroes')
const loadingRecruitment = ref(false)
const recruitmentError = ref('')
const recruitActionError = ref('')

const recruitment = ref({
  maxHeroes: 2,
  ownedCount: 0,
  ownedHeroes: [],
  recruitableHeroes: []
})

const dismissTarget = ref(null)
const dismissBusy = ref(false)

const hasSlot = computed(() => recruitment.value.ownedCount < recruitment.value.maxHeroes)

const fetchRecruitment = async () => {
  loadingRecruitment.value = true
  recruitmentError.value = ''
  try {
    const res = await fetch('http://localhost:3000/game/heroes/recruitment', {
      credentials: 'include'
    })
    const data = await res.json()
    if (!data.success) {
      recruitmentError.value = 'Impossible de charger le recrutement.'
      return
    }
    recruitment.value = data.recruitment
  } catch (e) {
    recruitmentError.value = 'Erreur reseau sur le recrutement.'
    console.error(e)
  } finally {
    loadingRecruitment.value = false
  }
}

const recruitHero = async (type) => {
  recruitActionError.value = ''
  try {
    const res = await fetch('http://localhost:3000/game/heroes/recruit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type })
    })
    const data = await res.json()
    if (!data.success) {
      recruitActionError.value = data.message || 'Recrutement impossible.'
      return
    }
    recruitment.value = data.recruitment
    emit('refresh-request')
  } catch (e) {
    recruitActionError.value = 'Erreur reseau pendant le recrutement.'
    console.error(e)
  }
}

const askDismiss = (hero) => {
  dismissTarget.value = hero
}

const cancelDismiss = () => {
  dismissTarget.value = null
}

const confirmDismiss = async () => {
  if (!dismissTarget.value) return
  dismissBusy.value = true
  recruitActionError.value = ''

  try {
    const res = await fetch(`http://localhost:3000/game/heroes/${dismissTarget.value.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!data.success) {
      recruitActionError.value = data.message || 'Suppression impossible.'
      return
    }

    recruitment.value = data.recruitment
    dismissTarget.value = null
    emit('refresh-request')
  } catch (e) {
    recruitActionError.value = 'Erreur reseau pendant la suppression.'
    console.error(e)
  } finally {
    dismissBusy.value = false
  }
}

onMounted(fetchRecruitment)

watch(() => activeTab.value, (tab) => {
  if (tab === 'recruitment') fetchRecruitment()
})
</script>

<template>
  <div class="hero-management-overlay">
    <div class="hero-management-panel">
      <button class="btn-close" @click="emit('close')" title="Fermer">x</button>

      <div class="panel-header">
        <h2>Gestion des heros</h2>
        <p class="subtitle">Gere tes heros actifs et le recrutement</p>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'heroes' }" @click="activeTab = 'heroes'">
          Mes heros
        </button>
        <button class="tab" :class="{ active: activeTab === 'recruitment' }" @click="activeTab = 'recruitment'">
          Recrutement
        </button>
      </div>

      <div v-if="activeTab === 'heroes'" class="tab-content">
        <div v-if="heroes.length === 0" class="empty-state">Aucun hero disponible.</div>

        <div v-else class="heroes-grid">
          <div v-for="hero in heroes" :key="hero.id" class="hero-card">
            <div class="hero-header">
              <img :src="hero.imageUrl" class="hero-avatar" alt="Hero icon" />
              <div class="hero-info">
                <div class="name-row">
                  <span class="hero-name">{{ hero.name }}</span>
                  <span class="hero-lvl">Niv. {{ hero.level }}</span>
                </div>
                <button
                  v-if="hero.battleId"
                  class="btn-watch-battle"
                  @click.stop="emit('watch-battle', hero.battleId)"
                  title="Regarder le combat en cours"
                >
                  Voir combat
                </button>
              </div>
            </div>

            <div class="hero-stats">
              <div class="stat">
                <span class="label">ATK</span>
                <span class="value">{{ hero.attack }}</span>
              </div>
              <div class="stat">
                <span class="label">DEF</span>
                <span class="value">{{ hero.defense }}</span>
              </div>
            </div>

            <div class="hero-troops">
              <div class="progress-bar">
                <div class="fill" :style="{ width: (hero.troops / hero.maxTroops * 100) + '%' }"></div>
              </div>
              <span class="troops-text">{{ hero.troops }} / {{ hero.maxTroops }} troupes</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="tab-content recruitment-content">
        <div class="recruitment-header">
          <div class="slot-info">
            Limite: {{ recruitment.ownedCount }} / {{ recruitment.maxHeroes }} heros actifs
          </div>
          <div class="slot-note">
            Tu ne peux pas recruter 2 fois le meme type.
          </div>
        </div>

        <div v-if="recruitActionError" class="error-box">{{ recruitActionError }}</div>
        <div v-if="recruitmentError" class="error-box">{{ recruitmentError }}</div>

        <div class="section-title">Heros possedes (suppression)</div>
        <div class="owned-list">
          <div v-for="hero in recruitment.ownedHeroes" :key="hero.id" class="owned-card">
            <div class="owned-main">
              <img :src="hero.imageUrl" class="owned-avatar" alt="Hero" />
              <div>
                <div class="owned-name">{{ hero.name }}</div>
                <div class="owned-type">{{ hero.type }}</div>
              </div>
            </div>
            <button class="btn-remove" :disabled="!!hero.battleId" @click="askDismiss(hero)">
              Supprimer
            </button>
          </div>
          <div v-if="recruitment.ownedHeroes.length === 0" class="empty-inline">Aucun hero possede.</div>
        </div>

        <div class="section-title">Heros recrutables</div>
        <div v-if="loadingRecruitment" class="empty-inline">Chargement...</div>
        <div v-else class="recruit-grid">
          <div v-for="hero in recruitment.recruitableHeroes" :key="hero.type" class="recruit-card">
            <div class="recruit-head">
              <img :src="hero.imageUrl" class="owned-avatar" alt="Hero" />
              <div>
                <div class="owned-name">{{ hero.name }}</div>
                <div class="owned-type">{{ hero.type }}</div>
              </div>
            </div>
            <div class="recruit-stats">ATK {{ hero.attack }} | DEF {{ hero.defense }} | Troupes {{ hero.maxTroops }}</div>
            <button class="btn-recruit" :disabled="!hasSlot" @click="recruitHero(hero.type)">
              Recruter
            </button>
          </div>
          <div v-if="recruitment.recruitableHeroes.length === 0" class="empty-inline">
            Aucun hero recrutable (deja possedes ou limite atteinte).
          </div>
        </div>
      </div>

      <div v-if="dismissTarget" class="confirm-overlay">
        <div class="confirm-box">
          <h3>Confirmation</h3>
          <p>
            Supprimer {{ dismissTarget.name }} ?
            Les niveaux et la progression seront perdus.
          </p>
          <div class="confirm-actions">
            <button class="btn-cancel" :disabled="dismissBusy" @click="cancelDismiss">Non</button>
            <button class="btn-confirm" :disabled="dismissBusy" @click="confirmDismiss">Oui</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-management-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.hero-management-panel {
  position: relative;
  width: min(860px, 88vw);
  height: min(620px, 82vh);
  background: rgba(15, 15, 15, 0.97);
  border: 1px solid #555;
  border-radius: 10px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
  padding: 22px;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  border-radius: 7px;
  border: 1px solid #888;
  background: #2a2a2a;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.btn-close:hover { background: #3a3a3a; }

.panel-header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.45rem;
}

.subtitle {
  margin: 6px 0 0;
  color: #b8b8b8;
  font-size: 0.95rem;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  background: #222;
  border: 1px solid #4b4b4b;
  color: #ddd;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.tab.active {
  background: #3a4f66;
  border-color: #6e8aaa;
  color: #fff;
}

.tab-content { min-height: 0; }

.empty-state {
  color: #d0d0d0;
  border: 1px dashed #777;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  height: 100%;
}

.heroes-grid {
  overflow-y: auto;
  padding-right: 6px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  align-content: start;
  height: 100%;
}

.hero-card {
  background: #222;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-header { display: flex; align-items: center; gap: 12px; }

.hero-avatar {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid #555;
  background: #111;
}

.hero-info { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 6px; }
.name-row { display: flex; align-items: center; gap: 8px; }
.hero-name { font-weight: bold; font-size: 1.1rem; color: #fff; }
.hero-lvl { font-size: 0.8rem; color: #e6c200; border: 1px solid #e6c200; padding: 1px 6px; border-radius: 4px; }

.btn-watch-battle {
  background: #e67e22;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
  font-weight: bold;
}
.btn-watch-battle:hover { background: #d35400; }

.hero-stats { display: flex; gap: 16px; }
.stat { display: flex; gap: 6px; font-size: 0.95rem; }
.label { color: #fbbf24; font-weight: bold; }

.progress-bar { width: 100%; height: 8px; background: #444; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
.fill { height: 100%; background: #ef4444; transition: width 0.3s ease; }
.troops-text { color: #ccc; }

.recruitment-content {
  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  gap: 10px;
  min-height: 0;
}

.recruitment-header { color: #ddd; font-size: 0.92rem; }
.slot-info { font-weight: 700; }
.slot-note { color: #b3b3b3; margin-top: 2px; }

.error-box {
  background: rgba(192, 57, 43, 0.2);
  border: 1px solid rgba(192, 57, 43, 0.7);
  color: #ffd2cc;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.section-title {
  color: #f0f0f0;
  font-weight: 700;
  font-size: 0.92rem;
}

.owned-list,
.recruit-grid {
  overflow-y: auto;
  display: grid;
  gap: 8px;
  align-content: start;
}

.owned-card,
.recruit-card {
  background: #1f1f1f;
  border: 1px solid #494949;
  border-radius: 8px;
  padding: 10px;
}

.owned-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.owned-main,
.recruit-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.owned-avatar {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #555;
  background: #111;
}

.owned-name { color: #fff; font-weight: 700; }
.owned-type { color: #b9b9b9; font-size: 0.8rem; }

.btn-remove {
  background: #7f2d2d;
  border: 1px solid #b14a4a;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recruit-stats {
  color: #c6c6c6;
  font-size: 0.82rem;
  margin: 8px 0;
}

.btn-recruit {
  background: #2a7b40;
  border: 1px solid #4ea96b;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-recruit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.empty-inline {
  color: #adadad;
  font-size: 0.86rem;
}

.confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.confirm-box {
  width: min(460px, 88vw);
  background: #1f1f1f;
  border: 1px solid #616161;
  border-radius: 8px;
  padding: 16px;
}

.confirm-box h3 { margin: 0 0 10px; }
.confirm-box p { margin: 0; color: #d2d2d2; }

.confirm-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel,
.btn-confirm {
  border-radius: 6px;
  border: 1px solid #666;
  padding: 7px 12px;
  cursor: pointer;
}

.btn-cancel { background: #2b2b2b; color: #ddd; }
.btn-confirm { background: #8f2e2e; border-color: #c15d5d; color: #fff; }
</style>
