/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 * @author NikLever / http://niklever.com
 */

class VRButton{
    /**
     * Accessing WebXR api
     // Using three.js, we access xr via xr property of renderer (which is an instance of XRManager class)
     // Web Xr is accessed by navigator object (navigator.xr) which is of type XRSystem interface & has two methods: 
     // 1- is SessionSupported, 2- requestSession (If session SessionSupported returned' true, takes two parameters: sessionMode, sessionInit) 
     */

    /**
    * Steps for creating button:
    // 1- Check there is an xr component of the navigator
    // 2- If xr exists check that the type of session is supported
    // 3- If supported, set the click event to request a xr session
    // 4- If we are currently in an xr session, then use session.end and a callback to end and update our app
    // 5- If no xr component, check for secure browsing
    // 6- If still no xr, display a website to provide advice 
    */
   
	constructor( renderer, options ) {
        this.renderer = renderer;
        if (options !== undefined){
            this.onSessionStart = options.onSessionStart;
            this.onSessionEnd = options.onSessionEnd;
            // define session init (used as parameter for requestSession)
            this.sessionInit = options.sessionInit;
            // define session mode (used as parameter for requestSession)
            this.sessionMode = ( options.inline !== undefined && options.inline ) ? 'inline' : 'immersive-vr';
        }else{
            this.sessionMode = 'immersive-vr';
        }
        
       if (this.sessionInit === undefined ) this.sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor' ] };
        // 1- Check there is an xr component of the navigator
        if ( 'xr' in navigator ) {
            const self = this
			const button = document.createElement( 'button' );
			button.style.display = 'none';
            button.style.height = '40px';
            // 2- If xr exists check that the type of session is supported
			navigator.xr.isSessionSupported( this.sessionMode ).then( ( supported ) => {
                // 3- If supported, set the click event to request a xr session
				if(supported)
                {
                    this.showEnterVR( button )
                    self.inputSources = navigator.xr.inputSources
                }
                else{
                    this.showWebXRNotFound( button );
                }  
                if (options && options.vrStatus) options.vrStatus( supported );
                
			} );
            document.body.appendChild( button );
		} 
        else // when xr is missing
        { 
			const message = document.createElement( 'a' );
            // 5- If no xr component, check for secure browsing
            // check if xr is missing because we are not using "https" (check for secure browsing)
			if ( window.isSecureContext === false ) {
                // message to say replace http with https
				message.href = document.location.href.replace( /^http:/, 'https:' );
				message.innerHTML = 'WEBXR NEEDS HTTPS';        
			} 
            // 6- If still no xr, display a website to provide advice 
            else 
            {
            // else we send a link 'https://immersiveweb.dev/' 
            // to show user steps to take to make the page work correctly
				message.href = 'https://immersiveweb.dev/';
				message.innerHTML = 'WEBXR NOT AVAILABLE';
			}

			message.style.left = '0px';
			message.style.width = '100%';
			message.style.textDecoration = 'none';

			this.stylizeElement( message, false );
            message.style.bottom = '0px';
            message.style.opacity = '1';
            
            document.body.appendChild ( message );
            
            if (options.vrStatus) options.vrStatus( false );

		}

    } // Constructor

     // click event to request a xr session
	showEnterVR( button ) 
    {
        let currentSession = null;
        const self = this;      
        this.stylizeElement( button, true, 30, true );       
        function onSessionStarted( session ) {
            session.addEventListener( 'end', onSessionEnded );
            self.renderer.xr.setSession( session );
            self.stylizeElement( button, false, 12, true );            
            button.textContent = 'EXIT VR';
            currentSession = session;          
            if (self.onSessionStart !== undefined) self.onSessionStart();
        }
        function onSessionEnded( ) {
            currentSession.removeEventListener( 'end', onSessionEnded );
            self.stylizeElement( button, true, 12, true );
           button.textContent = 'ENTER VR';
            currentSession = null;            
            if (self.onSessionEnd !== undefined) self.onSessionEnd();
        }
        //

        button.style.display = '';
        button.style.right = '20px';
        button.style.width = '80px';
        button.style.cursor = 'pointer';
        button.innerHTML = '<i class="fas fa-vr-cardboard"></i>';
    
        button.onmouseenter = function () {
            button.style.fontSize = '12px'; 
            button.textContent = (currentSession===null) ? 'ENTER VR' : 'EXIT VR';
            button.style.opacity = '1.0';
        };

        button.onmouseleave = function () {      
            button.style.fontSize = '30px'; 
            button.innerHTML = '<i class="fas fa-vr-cardboard"></i>';
            button.style.opacity = '0.5';
        };
        // 2- request session when button is clicked
        button.onclick = function () {

            if ( currentSession === null ) 
            {
                // WebXR's requestReferenceSpace only works if the corresponding feature
                // was requested at session creation time. For simplicity, just ask for
                // the interesting ones as optional features, but be aware that the
                // requestReferenceSpace call will fail if it turns out to be unavailable.
                // ('local' is always available for immersive sessions and doesn't need to
                // be requested separately.)

                navigator.xr.requestSession( self.sessionMode, self.sessionInit ).then( onSessionStarted );
            } 
            else            
            {
                currentSession.end();
            }
        };
    } // showEnterVR


    disableButton(button) {
        button.style.cursor = 'auto';
        button.style.opacity = '0.5';
        
        button.onmouseenter = null;
        button.onmouseleave = null;

        button.onclick = null;
    }

    showWebXRNotFound( button ) {
        this.stylizeElement( button, false );
        
        this.disableButton(button);

        button.style.display = '';
        button.style.width = '100%';
        button.style.right = '0px';
        button.style.bottom = '0px';
        button.style.border = '';
        button.style.opacity = '1';
        button.style.fontSize = '13px';
        button.textContent = 'VR NOT SUPPORTED';
        
        

    }

    stylizeElement( element, active = true, fontSize = 13, ignorePadding = false ) {

        element.style.position = 'absolute';
        element.style.bottom = '20px';
        if (!ignorePadding) element.style.padding = '12px 6px';
        element.style.border = '1px solid #fff';
        element.style.borderRadius = '4px';
        element.style.background = (active) ? 'rgba(20,150,80,1)' : 'rgba(180,20,20,1)';
        element.style.color = '#fff';
        element.style.font = `normal ${fontSize}px sans-serif`;
        element.style.textAlign = 'center';
        element.style.opacity = '0.5';
        element.style.outline = 'none';
        element.style.zIndex = '999';

    }

		

};

export { VRButton };
