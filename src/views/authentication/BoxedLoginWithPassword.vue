<script setup lang="ts">
import LoginFormWithPassword from '@/components/auth/LoginFormWithPassword.vue';

const roles = [
  { title: 'Manager', icon: 'mdi-account-tie', note: 'Sales, stock and staff' },
  { title: 'Cashier', icon: 'mdi-cash-register', note: 'Sale counter and receipts' },
  { title: 'Product Entry', icon: 'mdi-package-variant-plus', note: 'Products and stock in' },
];
</script>

<template>
  <div class="login-page">
    <div class="login-page__left d-none d-md-flex">
      <div class="login-page__glow login-page__glow--one"></div>
      <div class="login-page__glow login-page__glow--two"></div>

      <div class="login-hero">
        <div class="login-hero__brand">
          <v-icon size="30" color="white">mdi-storefront</v-icon>
          <span>SUPER MART</span>
        </div>
        <h1 class="login-hero__title">Your shop, one screen.</h1>
        <p class="login-hero__text">
          Bill at the counter, receive stock, keep products tidy and watch today's sales — all from the same place.
        </p>

        <div class="preview">
          <div class="preview__head">
            <span><v-icon size="16" color="white">mdi-chart-box-outline</v-icon> Today</span>
            <span class="preview__live">Live</span>
          </div>
          <div class="preview__kpis">
            <div class="preview__kpi">
              <span class="preview__label">Sales</span>
              <span class="preview__value">Rs 84,250</span>
            </div>
            <div class="preview__kpi">
              <span class="preview__label">Bills</span>
              <span class="preview__value">126</span>
            </div>
            <div class="preview__kpi">
              <span class="preview__label">Items sold</span>
              <span class="preview__value">418</span>
            </div>
          </div>
          <div class="preview__rows">
            <div v-for="row in [['Cash', '62%'], ['Card', '26%'], ['Online', '12%']]" :key="row[0]" class="preview__row">
              <span>{{ row[0] }}</span>
              <div class="preview__bar"><i :style="{ width: row[1] }"></i></div>
              <span>{{ row[1] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="login-page__right">
      <div class="login-card">
        <div class="login-card__mark">
          <v-icon size="28" color="white">mdi-storefront</v-icon>
        </div>
        <h2 class="login-card__title">Welcome Back</h2>
        <p class="login-card__subtitle">Sign in to your Super Mart store panel.</p>

        <LoginFormWithPassword />

        <div class="login-roles">
          <div v-for="role in roles" :key="role.title" class="login-role">
            <v-icon size="18" color="primary">{{ role.icon }}</v-icon>
            <span class="login-role__title">{{ role.title }}</span>
            <span class="login-role__note">{{ role.note }}</span>
          </div>
        </div>

        <p class="login-card__help">
          <v-icon size="15" color="success">mdi-shield-check-outline</v-icon>
          Forgot your password? Your manager can reset it from Setup → Users.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: #fff;
}

.login-page__left {
  position: relative;
  flex: 1 1 58%;
  align-items: center;
  justify-content: center;
  padding: 48px;
  overflow: hidden;
  background: linear-gradient(135deg, #1e6fd0 0%, #1565c0 45%, #0f3460 100%);
}

.login-page__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.45;
}

.login-page__glow--one {
  width: 340px;
  height: 340px;
  top: -80px;
  left: -60px;
  background: #58a6ff;
}

.login-page__glow--two {
  width: 300px;
  height: 300px;
  bottom: -70px;
  right: -40px;
  background: #0b2a4f;
}

.login-hero {
  position: relative;
  z-index: 1;
  max-width: 520px;
  color: #fff;
}

.login-hero__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 26px;
}

.login-hero__title {
  font-size: 40px;
  line-height: 1.15;
  font-weight: 700;
  margin-bottom: 14px;
}

.login-hero__text {
  font-size: 15px;
  line-height: 1.6;
  opacity: 0.85;
  margin-bottom: 34px;
}

.preview {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(6px);
}

.preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
}

.preview__live {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.preview__kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.preview__kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
}

.preview__label {
  font-size: 11.5px;
  opacity: 0.75;
}

.preview__value {
  font-size: 18px;
  font-weight: 700;
}

.preview__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview__row {
  display: grid;
  grid-template-columns: 58px 1fr 42px;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  opacity: 0.9;
}

.preview__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.preview__bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: #9fd0ff;
}

.login-page__right {
  flex: 1 1 42%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f3f7fc 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 30px 28px 24px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgb(var(--v-theme-borderColor));
  box-shadow: 0 18px 40px rgba(15, 52, 96, 0.1);
  text-align: center;
}

.login-card__mark {
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e88e5, #1565c0);
  box-shadow: 0 8px 18px rgba(21, 101, 192, 0.35);
}

.login-card__title {
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--v-theme-textPrimary));
}

.login-card__subtitle {
  font-size: 13.5px;
  color: rgb(var(--v-theme-lightgray));
  margin-bottom: 22px;
}

.login-roles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgb(var(--v-theme-borderColor));
}

.login-role {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 12px;
  background: rgb(var(--v-theme-lightprimary));
}

.login-role__title {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-textPrimary));
}

.login-role__note {
  font-size: 10.5px;
  line-height: 1.25;
  color: rgb(var(--v-theme-lightgray));
}

.login-card__help {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-lightgray));
  margin: 16px 0 0;
}

@media (max-width: 959px) {
  .login-page__right {
    background: linear-gradient(160deg, #1565c0 0%, #0f3460 100%);
  }
}
</style>
