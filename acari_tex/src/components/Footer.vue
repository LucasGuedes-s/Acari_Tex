<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-brand">
        <h2>Linha Tex</h2>
        <p>Simplificando a gestão da sua produção têxtil.</p>
      </div>

      <!-- Links -->
      <div class="footer-links">
        <h3>Links Rápidos</h3>
        <ul>
          <li><a href="#">Início</a></li>
          <li><a href="#">Funcionalidades</a></li>
          <li><a href="#">Planos</a></li>
          <li><a href="#">Contato</a></li>
        </ul>
      </div>

      <!-- Contato -->
      <div class="footer-contact">
        <h3>Contato</h3>
        <p>📧 linhatex.suporte@gmail.com</p>
        <p>📞 (84) 99428-0599</p>
      </div>

      <!-- Redes sociais -->
      <div class="footer-social">
        <h3>Siga-nos</h3>
        <div class="icons">
          <a href="https://www.instagram.com/linha.tex?igsh=MWdmM2VhdGZscTJicg%3D%3D&utm_source=qr"><span>📸</span></a>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>© 2025 Linha Tex — Todos os direitos reservados.</p>
    </div>
  </footer>
</template>

<script>
export default {
  name: "FooterLanding",
};
</script>

<style scoped>
.footer {
  background: var(--verde-escuro);
  color: #fff;
  padding: 50px 20px 20px;
  margin-top: 60px;
}

.footer-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Brand */
.footer-brand h2 {
  font-size: 1.6rem;
  margin-bottom: 10px;
}
.footer-brand p {
  font-size: 0.95rem;
  color: #ddd;
}

/* Links */
.footer-links h3,
.footer-contact h3,
.footer-social h3 {
  font-size: 1.2rem;
  margin-bottom: 12px;
  display: flex;
}
.footer-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.footer-links ul li {
  margin: 6px 0;
}
.footer-links ul li a {
  color: #ddd;
  text-decoration: none;
  transition: color 0.3s;
  display: flex;
}
.footer-links ul li a:hover {
  color: var(--verde-claro);
}

/* Contato */
.footer-contact p {
  margin: 6px 0;
  font-size: 0.95rem;
  display: flex;
}

/* Redes sociais */
.footer-social .icons {
  display: flex;
  gap: 12px;
}
.footer-social .icons a {
  background: var(--verde-claro);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-size: 1.2rem;
  text-decoration: none;
  transition: transform 0.3s, background 0.3s;
}
.footer-social .icons a:hover {
  transform: scale(1.1);
  background: #0f4d2a;
}

/* Bottom */
.footer-bottom {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: 20px;
}
.footer-bottom p {
  font-size: 0.85rem;
  color: #ccc;
}
</style>
