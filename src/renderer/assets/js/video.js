const videoLeft = document.getElementById("video-left");
const videoRight = document.getElementById("video-right");
const leftContainer = videoLeft.parentElement.parentElement;
const rightContainer = videoRight.parentElement.parentElement;


// Función para manejar el hover
const handleHoverPlay = (video, container) => {
  container.addEventListener("mouseenter", () => {
    video.play();
  });
  container.addEventListener("mouseleave", () => {
    video.pause();
    video.currentTime = 0; // Reinicia el video al salir (opcional)
  });
};

videoRight.addEventListener("click", async () => {
  try {
 
    
    const result = await window.api.runPythonApp();

    
    console.log("Resultado:", result);
    // Aquí puedes procesar el resultado de Python
    
  } catch (error) {

    console.error("Error ejecutando Python:", error);
  }
});

// Inicializar los efectos hover
handleHoverPlay(videoLeft, leftContainer);
handleHoverPlay(videoRight, rightContainer);