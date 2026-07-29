<template>
  <div class="site-frame">
    <a class="skip-link" href="#main-content">跳至主要内容</a>
    <SiteHeader />
    <main id="main-content">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
