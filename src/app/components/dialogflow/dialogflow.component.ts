import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  NgZone,
  HostListener,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

interface Message {
  sender: 'user' | 'assistant';
  content: string;
  formattedContent?: SafeHtml;
}
@Component({
  selector: 'app-dialogflow',
  templateUrl: './dialogflow.component.html',
  styleUrls: ['./dialogflow.component.css'],
})
export class DialogflowComponent implements OnInit, OnDestroy {
  @ViewChild('chatBox') private chatBox!: ElementRef;
  transcript: string = 'Aquí aparecerá tu mensaje...';
  respuesta: string = 'Aquí aparecerá la respuesta...';
  messages: Message[] = [];
  socket!: WebSocket;
  recognition: any;
  ocultar: boolean = true;
  isRecognitionActive: boolean = false;
  isFirstRecognition: boolean = true;
  isPlayingAudio: boolean = false;
  iluminado = false;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private uniforms!: { [key: string]: { value: any } };
  private analyser!: THREE.AudioAnalyser;
  private clock = new THREE.Clock();
  private mouseX = 0;
  private mouseY = 0;

  constructor(
    private sanitizer: DomSanitizer,
    private el: ElementRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.initThree();
    this.addMesh();
    this.animate();
    /*   this.messages.push(
      {
        sender: 'user',
        content: '¿Cuál es el clima hoy?',
        formattedContent: '<p>¿Cuál es el clima hoy?</p>' as SafeHtml,
      },
      {
        sender: 'assistant',
        content: 'El clima es soleado con 25°C.',
        formattedContent: '<p>El clima es soleado con 25°C.</p>' as SafeHtml,
      },
      {
        sender: 'user',
        content: 'Gracias.',
        formattedContent: '<p>Gracias.</p>' as SafeHtml,
      },
      {
        sender: 'assistant',
        content: 'El clima es soleado con 25°C.',
        formattedContent: '<p>El clima es soleado con 25°C.</p>' as SafeHtml,
      },
      {
        sender: 'user',
        content: 'Gracias.',
        formattedContent: '<p>Gracias.</p>' as SafeHtml,
      }
    ); */
  }

  llamar() {
    this.iluminado = true;
    setTimeout(() => {
      this.iluminado = false; // Se apaga después de 0.5 segundos
    }, 500);
    this.ocultar = false;
    this.socket = new WebSocket(
      'wss://agente-voz-production.up.railway.app/ws/conversar'
    );
    /*  this.socket = new WebSocket(
      'wss://s3svcvl8-8000.use2.devtunnels.ms/ws/conversar'
    ); */
    //this.socket = new WebSocket('ws://localhost:8000/ws/conversar');

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const assistantResponse = data.texto;
      const audioBase64 = data.audio;

      this.respuesta = 'Respuesta del asistente: ' + assistantResponse;

      const formattedResponse = this.sanitizer.bypassSecurityTrustHtml(
        assistantResponse.replace(/\n/g, '<br><br>')
      );

      this.messages.push({
        sender: 'assistant',
        content: assistantResponse,
        formattedContent: formattedResponse,
      });

      this.scrollToBottom();

      this.stopRecognition(); // Asegúrate de detener el reconocimiento antes de reproducir audio

      this.playAudio(audioBase64);
      this.initAudio(audioBase64);
    };

    this.socket.onopen = () => {
      console.log('Conexión WebSocket abierta.');

      // Configurar temporizador de 3 minutos (180,000 ms)
      setTimeout(() => {
        this.finalizarLlamada();
      }, 300000); // 3 minutos
    };

    this.socket.onclose = () => {
      console.log('Conexión WebSocket cerrada.');
      Swal.fire({
        title: 'Se ha finalizado la llamada',
        text: 'Gracias por comunicarte con nosotros.',
        icon: 'success',
        confirmButtonText: 'Cerrar',
      });
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.transcript = 'Tu mensaje: ' + transcript;

      this.messages.push({ sender: 'user', content: transcript });

      this.socket.send(transcript);

      this.scrollToBottom();
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      if (!this.isPlayingAudio) {
        this.startRecognition(); // Reinicia de inmediato si no se está reproduciendo audio
      }
    };

    this.recognition.onerror = (event: any) =>
      console.error('Error en el reconocimiento de voz: ', event.error);
  }

  private finalizarLlamada() {
    if (this.socket) {
      this.socket.close(); // Cerrar el WebSocket
    }
    if (this.recognition) {
      this.stopRecognition(); // Detener el reconocimiento de voz
    }

    // Mostrar mensaje al usuario
    Swal.fire({
      title: 'Llamada finalizada',
      text: 'El tiempo máximo de la llamada ha sido alcanzado.',
      icon: 'info',
      confirmButtonText: 'Aceptar',
    });

    // Reiniciar o redirigir según sea necesario
    setTimeout(() => {
      window.location.reload();
    }, 5000); // Opcional, recargar página tras 5 segundos
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.close();
    }
    if (this.recognition) {
      this.stopRecognition();
    }
  }

  startRecognition() {
    if (!this.isRecognitionActive && !this.isPlayingAudio) {
      this.isRecognitionActive = true;

      if (this.isFirstRecognition) {
        this.isFirstRecognition = false;
        this.ocultar = false;
        this.recognition.start(); // Inicia sin retraso
      } else {
        this.recognition.start();
      }
    }
  }

  private stopRecognition() {
    if (this.isRecognitionActive) {
      this.recognition.stop();
      this.isRecognitionActive = false;
    }
  }

  private scrollToBottom(): void {
    try {
      this.chatBox.nativeElement.scrollTop =
        this.chatBox.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error al hacer scroll: ', err);
    }
  }

  private playAudio(base64Audio: string) {
    this.stopRecognition(); // Detener reconocimiento durante la reproducción
    this.isPlayingAudio = true;

    const audioBlob = this.base64ToBlob(base64Audio, 'audio/mp3'); // Convertir base64 a Blob
    const audioElement = document.createElement('audio'); // Crear elemento de audio
    audioElement.volume = 0; // Configurar el volumen en 0
    audioElement.controls = false; // Opcional, para mostrar controles
    //document.body.appendChild(audioElement); // Añadir a la página (opcional, dependiendo de tu diseño)

    const mediaSource = new MediaSource();
    audioElement.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');

      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          sourceBuffer.appendBuffer(
            new Uint8Array(reader.result as ArrayBuffer)
          );
        }

        // Marcar el fin del flujo de datos y reproducir el audio
        sourceBuffer.addEventListener('updateend', () => {
          mediaSource.endOfStream();
          audioElement.play().catch((error) => {
            console.error('Error al reproducir el audio:', error);
          });
        });
      };
      reader.readAsArrayBuffer(audioBlob);
    });

    // Detectar el final de la reproducción
    audioElement.onended = () => {
      this.isPlayingAudio = false; // Actualizar estado
      this.startRecognition(); // Reiniciar reconocimiento de voz inmediatamente

      // Notificar al iframe que el audio ha terminado
      window.parent.postMessage(
        { type: 'audioPlaying', isPlaying: false },
        '*'
      );
    };
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const sanitizeBase64 = (base64: string): string => {
      return base64.replace(/[^A-Za-z0-9+/=]/g, '');
    };
    const byteCharacters = atob(base64);
    const byteNumbers = Array.from(byteCharacters, (char) =>
      char.charCodeAt(0)
    );
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private initThree() {
    const container = this.el.nativeElement;

    // Configurar el renderizador con un canvas existente
    this.renderer = new THREE.WebGLRenderer({
      canvas: container.querySelector('canvas') || undefined,
      antialias: true,
      alpha: true, // Habilitar transparencia
    });
    this.renderer.setSize(300, 300);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Escena y cámara
    this.scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();
    loader.load(
      'assets/sphere.png', // Cambia esto por la ruta de tu imagen
      (texture) => {
        this.scene.background = texture; // Asigna la textura como fondo
      },
      undefined,
      (error) => {
        console.error('Error al cargar la imagen:', error);
      }
    );
    this.camera = new THREE.PerspectiveCamera(45, 400 / 400, 0.1, 1000);
    this.camera.position.set(0, -2, 14);
    this.camera.lookAt(0, 0, 0);

    // Postprocesado
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(400, 400),
      0.18,
      0.23,
      0.4
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);
  }

  private addMesh() {
    // Configuración de uniforms
    this.uniforms = {
      u_time: { value: 0.0 },
      u_frequency: { value: 0.0 },
      u_red: { value: 0.1 },
      u_green: { value: 1.0 }, // Verde intenso
      u_blue: { value: 0.1 },
    };

    // Material con shaders
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform float u_time;
        uniform float u_frequency;
        uniform float u_pointSize;
        varying float v_distance;

        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
          return mod289(((x*34.0)+10.0)*x);
        }

        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }

        vec3 fade(vec3 t) {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
        }

        float pnoise(vec3 P, vec3 rep) {
          vec3 Pi0 = mod(floor(P), rep);
          vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }

        void main() {
            float noise = 3.0 * pnoise(position + u_time, vec3(10.0));
            float displacement = (u_frequency / 50.0) * (noise / 10.0);
            vec3 newPosition = position + normal * displacement;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

            // Configuración del tamaño del punto
            gl_PointSize = u_pointSize;
        }`,
      fragmentShader: `
        uniform float u_red;
        uniform float u_green;
        uniform float u_blue;

        void main() {
            // Efecto circular para los puntos
            vec2 uv = gl_PointCoord.xy - 0.5;
            if (dot(uv, uv) > 0.25) discard;

            gl_FragColor = vec4(u_red, u_green, u_blue, 1.0);
        }`,
    });

    // Geometría
    const geometry = new THREE.IcosahedronGeometry(5, 20);
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
  }

  private animate() {
    this.ngZone.runOutsideAngular(() => {
      const render = () => {
        // Actualiza valores de uniform
        this.uniforms['u_time'].value = this.clock.getElapsedTime();
        if (this.analyser) {
          this.uniforms['u_frequency'].value =
            this.analyser.getAverageFrequency();
        }

        // Interacción con mouse
        this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05;
        this.camera.position.y +=
          (-this.mouseY - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        this.composer.render();
        requestAnimationFrame(render);
      };
      render();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    this.mouseX = (event.clientX - windowHalfX) / 100;
    this.mouseY = (event.clientY - windowHalfY) / 100;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (event.touches.length === 1) {
      // Asegúrate de que solo un dedo esté tocando
      const touch = event.touches[0];
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;

      this.mouseX = (touch.clientX - windowHalfX) / 100;
      this.mouseY = (touch.clientY - windowHalfY) / 100;
    }
  }

  private initAudio(base64Audio: string) {
    const listener = new THREE.AudioListener();
    this.camera.add(listener);

    // Cargar un archivo de audio
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.Audio(listener);

    // Convertir base64 a buffer
    const audioBlob = this.base64ToBlob(base64Audio, 'audio/mp3');
    const audioURL = URL.createObjectURL(audioBlob);

    audioLoader.load(audioURL, (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(1.0);
      sound.play();
      // Configurar el analizador de audio
      this.analyser = new THREE.AudioAnalyser(sound, 256);
    });
  }
}
