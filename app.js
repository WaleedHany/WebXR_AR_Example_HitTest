import * as THREE from './libs/three125/three.module.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { RGBELoader } from './libs/three/jsm/RGBELoader.js';
import { ARButton } from './libs/ARButton.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { ControllerGestures } from './libs/ControllerGestures.js';

class App{
	constructor()
    {
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        this.clock = new THREE.Clock();
        
        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

		this.assetsPath = './assets/ar-shop/';
        
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		this.camera.position.set( 0, 1.6, 0 );
        
		this.scene = new THREE.Scene();

		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        ambient.position.set( 0.5, 1, 0.25 );
		this.scene.add(ambient);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
        
        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );
        
        this.setupXR();
		
		window.addEventListener('resize', this.resize.bind(this) );
        
	}
    
    setupXR(){
        this.renderer.xr.enabled = true;
        
        // 1: If navigator includes xr and immersive-ar is supported then show the ar-button class
        if ( 'xr' in navigator ) {

			navigator.xr.isSessionSupported( 'immersive-ar' ).then( ( supported ) => 
            {
                if (supported)
                {
                    // get html collection
                    const collection = document.getElementsByClassName("ar-button");
                    // convert html collection to an array since it is easier to handle
                    [...collection].forEach( el => {
                        el.style.display = 'block';
                    });
                }
			} );    
		} 
        
        const self = this;
        // hit test
        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        // define controller gestures
        this.gestures = new ControllerGestures( this.renderer );

        // triggered on screen touch
        function onSelect() {
            if (self.chair===undefined) return;
            
            if (self.reticle.visible){
                self.chair.position.setFromMatrixPosition( self.reticle.matrix );
                self.chair.visible = true;
            }
        }

        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'select', onSelect );
        // add rotate event
        this.gestures.addEventListener( 'rotate', (ev)=>{
            if (self.chair===undefined) return;
            if(self.chair!== undefined)
            {
                if (ev.initialise !== undefined)
                {
                    self.startQuaternion = self.chair.object.quaternion.clone();
                }else{
                    self.chair.object.quaternion.copy( self.startQuaternion );
                    self.chair.object.rotateY( ev.theta );
                }
            }       
        });
        this.scene.add( this.controller );
    }
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( './assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
    
	showChair(id)
    {
        // start AR session
        this.initAR();
        
		const loader = new GLTFLoader( ).setPath(this.assetsPath);
        const self = this;
        // use loading bar
        this.loadingBar.visible = true;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			`chair${id}.glb`,
			// called when the resource is loaded
			function ( gltf ) {

				self.scene.add( gltf.scene );
                self.chair = gltf.scene;
        
                self.chair.visible = false; 
                
                self.loadingBar.visible = false;
                
                self.renderer.setAnimationLoop( self.render.bind(self) );
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);
				
			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );

			}
		);
	}			
    
    // Initiate AR session without using three.js AR-button
    initAR()
    {
        // 2: Start an AR session
        let currentSession = null
        const self = this
        const sessionInit = {requiredFeatures:['hit-test']}

        function onSessionStarted( session ) 
        {
            session.addEventListener( 'end', onSessionEnded );
            self.renderer.xr.setReferenceSpaceType( 'local' );
            self.renderer.xr.setSession( session );      
            currentSession = session;          
        }

        function onSessionEnded( ) 
        {
            currentSession.removeEventListener( 'end', onSessionEnded );
            currentSession = null;        
            if (self.chair !== null){
                self.scene.remove( self.chair );
                self.chair = null;
            }      
            // end rendering loop by setting setAnimationLoop to null
            self.renderer.setAnimationLoop( null );
        }
        // request an immersive-ar session
        navigator.xr.requestSession('immersive-ar', sessionInit).then(onSessionStarted)
    }
    
    requestHitTestSource()
    {
        const self = this;       
        const session = this.renderer.xr.getSession();
        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) 
        {          
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {
                self.hitTestSource = source;
            } );
        } );

        session.addEventListener( 'end', function () 
        {
            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;
        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        if ( hitTestResults.length ) {
            // get hit test pose
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );
            // show reticle
            this.reticle.visible = true;
            this.reticle.matrix.fromArray( pose.transform.matrix );

        } else {

            this.reticle.visible = false;

        }

    }
    
	render( timestamp, frame ) {
        const dt = this.clock.getDelta();
        if ( frame ) {
            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );
            if ( this.renderer.xr.isPresenting ){
                this.gestures.update();
            }   
            if ( this.chair !== undefined ) this.chair.update(dt); 
        }

        this.renderer.render( this.scene, this.camera );

    }
}

export { App };