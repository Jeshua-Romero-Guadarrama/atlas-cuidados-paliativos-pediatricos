# Atlas de Cuidados Paliativos Pediatricos y Calidad de Vida
FROM node:20-alpine

WORKDIR /app

# Se copia server/ completo. Si la carpeta incluye node_modules (porque ya se
# ejecuto "npm install" en el equipo), el build no necesita red. Si no los
# incluye, se instalan aqui. El "if" hace que el build funcione en ambos casos,
# incluso en redes que interceptan el trafico TLS y rompen npm.
COPY server/ ./server/
RUN cd server && \
    if [ ! -d node_modules ]; then npm install --omit=dev --no-audit --no-fund; fi && \
    node -e "require('express'); require('mongodb'); console.log('Dependencias OK')"

# Aplicacion: datos, esquemas y frontend
COPY data/ ./data/
COPY img/ ./img/
COPY css/ ./css/
COPY js/ ./js/
COPY index.html ./index.html
COPY manifest.webmanifest ./manifest.webmanifest
# El service worker y la paleta declarada se sirven desde la raiz, igual que
# en GitHub Pages, para que el modo sin conexion funcione tambien en local
COPY sw.js ./sw.js
COPY paleta.config.json ./paleta.config.json

# Paginas estaticas para buscadores y archivos de publicacion. El contenedor
# debe servir exactamente lo mismo que GitHub Pages, o los enlaces del indice
# darian 404 en local
COPY sintomas/ ./sintomas/
COPY farmacos/ ./farmacos/
COPY escalas/ ./escalas/
COPY calculadoras/ ./calculadoras/
COPY comunicacion/ ./comunicacion/
COPY temas/ ./temas/
COPY casos/ ./casos/
COPY 404.html sitemap.xml robots.txt portada.svg seo.json ./

EXPOSE 3000
CMD ["node", "server/index.js"]
