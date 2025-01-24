import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  HostListener,
} from '@angular/core';
import { ConversationService } from 'src/app/services/conversation.service';
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
  selector: 'app-natalia',
  templateUrl: './natalia.component.html',
  styleUrls: ['./natalia.component.css'],
})
export class NataliaComponent implements OnInit {
  @ViewChild('chatBox') private chatBox!: ElementRef;
  transcript: string = '';
  messages: { sender: 'user' | 'assistant'; content: string }[] = [];
  recognition: any;
  audioContext!: AudioContext;
  mediaStream!: MediaStream;
  analyserAudio!: AnalyserNode;
  dataArray!: Uint8Array;

  ocultar: boolean = true;
  iluminado = false;

  isConnected = false;
  isSpeaking = false;

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
    private conversationService: ConversationService,
    private sanitizer: DomSanitizer,
    private el: ElementRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.initThree();
    this.addMesh();
    this.animate();
      this.messages.push(
      {
        sender: 'assistant',
        content: 'Interactua conmigo, tu asistente virtual lista para ayudarte en lo que necesites. ¡Habla y descubre lo que puedo hacer por ti!',
      },
      /* {
        sender: 'assistant',
        content: 'El clima es soleado con 25°C.',
      },
      {
        sender: 'user',
        content: 'Gracias.',
      },
      {
        sender: 'assistant',
        content: 'El clima es soleado con 25°C.',
      },
      {
        sender: 'user',
        content: 'Gracias.',
      } */
    );
  }

  async startConversation(): Promise<void> {
    this.initAudioCapture();
    this.iluminado = true;
    setTimeout(() => {
      this.iluminado = false; // Se apaga después de 0.5 segundos
    }, 500);
    this.ocultar = false;
    try {
      const hasPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!hasPermission) {
        alert('Microphone permission is required.');
        return;
      }

      // Verifica que la respuesta no sea `undefined`
      const response = await this.conversationService
        .getSignedUrl()
        .toPromise();
      if (!response) {
        throw new Error('No response from server');
      }

      const signedUrl = response.signedUrl;
      console.log('signedUrl', signedUrl);

      await this.conversationService.startConversation(
        signedUrl,
        () => {
          this.isConnected = true;
          console.log('Connected');
        },
        () => {
          this.isConnected = false;
          this.isSpeaking = false;
          console.log('Disconnected');
        },
        (error) => {
          console.error('Error:', error);
          alert('An error occurred.');
        },
        async (mode) => {
          // Si el agente está hablando, iniciar la captura del audio
          if (mode.mode === 'speaking') {
            this.isSpeaking = true;
          } else {
            this.isSpeaking = false;
            this.initSpeechRecognition();
          }
        }
      );
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            //this.messages.push({ sender: 'user', content: transcript });
            this.scrollToBottom();
          } else {
            interimTranscript += transcript;
          }
        }
        this.transcript = interimTranscript;
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
      };
    }
  }

  async initAudioCapture() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserAudio = this.audioContext.createAnalyser();
      source.connect(this.analyserAudio);
      this.analyserAudio.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyserAudio.frequencyBinCount);
      this.captureAudio();
    } catch (error) {
      console.error('Error capturing audio', error);
    }
  }

  captureAudio() {
    this.analyserAudio.getByteFrequencyData(this.dataArray);
    const volume = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
    if (volume > 50) {
      //this.messages.push({ sender: 'assistant', content: 'Detectando sonido...' });
      this.scrollToBottom();
    }
    requestAnimationFrame(() => this.captureAudio());
  }

  startListening() {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.chatBox.nativeElement.scrollTop = this.chatBox.nativeElement.scrollHeight;
    }, 100);
  }

  async endConversation(): Promise<void> {
    await this.conversationService.endConversation();
    this.isConnected = false;
    this.isSpeaking = false;
  }

  /* private scrollToBottom(): void {
    try {
      this.chatBox.nativeElement.scrollTop =
        this.chatBox.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error al hacer scroll: ', err);
    }
  } */

  finalizarLlamada() {
    /* setTimeout(() => {
      this.endConversation();
    }, 300000); // 3 minutos */
    Swal.fire({
      title: 'Se ha finalizado la llamada',
      text: 'Gracias por comunicarte con nosotros.',
      icon: 'success',
      confirmButtonText: 'Cerrar',
    });
    setTimeout(() => {
      window.location.reload();
    }, 5000);
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

        // Simulación de frecuencia de audio cuando el agente está hablando
        if (this.isSpeaking) {
          this.uniforms['u_frequency'].value = Math.random() * 200; // Valor aleatorio
        } else {
          this.uniforms['u_frequency'].value = 0;
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
}
