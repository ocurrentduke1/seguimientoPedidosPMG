document.addEventListener("DOMContentLoaded", () => {

    const inputCodigo = document.getElementById("codigo");
    const inputBandera = document.getElementById("bandera");

    const btnMC = document.getElementById("btnMC");
    const btnAE = document.getElementById("btnAE");
    const btnVerificador = document.getElementById("btnVerificador");

    inputCodigo.focus();

    const API = "http://192.168.108.36:3000/api"

    let etapasActivas = [];
    let rolActual = null;
    let nombreUsuario = null;

    const reglasRol = {
        "2": "2",
        "4": "2",
        "3": "4",
        "5": "4",
        "6": "3",
        "7": "3"
    };

    // ================================
    // OBTENER PEDIDO
    // ================================
    inputCodigo.addEventListener("keypress", async (e) => {

        if (e.key !== "Enter") return;
        const codigo = inputCodigo.value;
        if (!codigo) return;

        abrirModalEmpleado();

    });

    // ================================
    // BOTONES
    // ================================

    btnMC.addEventListener("click", () => {
        const destino = etapasActivas.includes("2") ? "4" : "2";
        enviarPatch(destino);
    });

    btnAE.addEventListener("click", () => {
        const destino = etapasActivas.includes("3") ? "5" : "3";
        enviarPatch(destino);
    });

    btnVerificador.addEventListener("click", () => {
        const destino = etapasActivas.includes("6") ? "7" : "6";
        enviarPatch(destino);
    });

    // ================================
    // PATCH
    // ================================
    async function enviarPatch(etapaDestino) {

        if (!tienePermiso(etapaDestino)) {
            mostrarToast("No tiene permiso para ejecutar esta acción");
            inputCodigo.focus();
            resetearApp(); // espera a que el toast se vea antes de limpiar
            return;
        }

        if (!inputCodigo.value || etapasActivas.length === 0) {
            mostrarToast("No hay pedido cargado");
            inputCodigo.focus();
            resetearApp(); // espera a que el toast se vea antes de limpiar
            return;
        }

        try {

            bloquearBotones(true);

            const response = await fetch(
                `${API}/pedidos/${inputCodigo.value}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ etapa: etapaDestino, usuario: nombreUsuario, rol: rolActual })
                }
            );

            if (!response.ok) {
                const error = await response.json();

                const mensaje =
                    error.error ||
                    error.message ||
                    "Error actualizando etapa";
                mostrarToast(mensaje);
                inputCodigo.focus();
                resetearApp(); // espera a que el toast se vea antes de limpiar
                return;
            }

            const data = await response.json();
            console.log("Respuesta del PATCH:", data);

            // 🔥 SIEMPRE sincronizamos desde backend
            etapasActivas = data.ETAPA.toString().split(".");

            inputBandera.value = `${data.ETAPA} - ${data.descripcionEtapa}`;

            mostrarToast(`✓ Se avanza a ${data.descripcionEtapa}`, "success");

            resetearApp(); // espera a que el toast se vea antes de limpiar

        } catch (error) {
            console.error(error);
        }
    }

    // ================================
    // VALIDAR EMPLEADO
    // ================================
    async function validarEmpleado(codigoEmpleado) {

        try {
            const response = await fetch(`${API}/usuarios?codigo=${codigoEmpleado}`);

            if (!response.ok) {
                const error = await response.json();
                mostrarToast(error.error || error.message || "Empleado no válido");
                inputCodigo.focus();
                return;
            }

            const data = await response.json();
            console.log("Datos del empleado:", data);

            rolActual = data.ROL;
            nombreUsuario = data.NOMBRE;

            document.getElementById("codigoEmpleadoMostrado").textContent = data.NOMBRE;
            document.getElementById("rolEmpleadoMostrado").textContent = obtenerNombreRol(rolActual);
            document.getElementById("infoEmpleado").classList.remove("hidden");

            return true;

        } catch (error) {
            console.error(error);
            mostrarToast("Error de conexión al validar empleado");
            inputCodigo.focus();
            resetearApp(); // espera a que el toast se vea antes de limpiar
        }
    }

    // ================================
    // PERMISOS
    // ================================
    function tienePermiso(etapaDestino) {

        if (rolActual === "1") return true; // encargado todo

        return reglasRol[etapaDestino] === rolActual;
    }

    // ================================
    // UI
    // ================================
    function configurarBotonesSegunRol() {

        const hayMCActivo = etapasActivas.includes("2") && !etapasActivas.includes("4");
        const hayAEActivo = etapasActivas.includes("3") && !etapasActivas.includes("5");
        const MCTerminado = etapasActivas.includes("4");
        const AETerminado = etapasActivas.includes("5");
        const enRevision = etapasActivas.includes("6");
        const yaRevisado = etapasActivas.includes("7");
        const esPedidoNuevo = etapasActivas.includes("1");
        const tieneSurtidoCompleto = etapasActivas.includes("4") || etapasActivas.includes("5");

        const puedeVerVerificador = !hayMCActivo && !hayAEActivo && !esPedidoNuevo
            && !yaRevisado && (tieneSurtidoCompleto || enRevision);

        // Botones de surtimiento — ocultar si está en revisión o ya cerrado
        const puedeSurtir = !enRevision && !yaRevisado;

        btnMC.style.display = "none";
        btnAE.style.display = "none";
        btnVerificador.style.display = "none";

        if (puedeSurtir && !MCTerminado && (rolActual === "1" || rolActual === "2")) {
            btnMC.style.display = "block";
        }

        if (puedeSurtir && !AETerminado && (rolActual === "1" || rolActual === "4")) {
            btnAE.style.display = "block";
        }

        if (puedeVerVerificador && (rolActual === "1" || rolActual === "3")) {
            btnVerificador.style.display = "block";
        }
    }

    function actualizarUI() {

        // MC
        btnMC.textContent = etapasActivas.includes("2")
            ? "Finalizar Surtido MC"
            : "Iniciar Surtido MC";

        // AE
        btnAE.textContent = etapasActivas.includes("3")
            ? "Finalizar Surtido AE"
            : "Iniciar Surtido AE";

        // Revisión
        btnVerificador.textContent = etapasActivas.includes("6")
            ? "Finalizar Revisión"
            : "Iniciar Revisión";


        // Si ya terminó MC (4), ya no puede volver a tocarlo
        if (etapasActivas.includes("4") || etapasActivas.includes("6") || etapasActivas.includes("7")) {
            btnMC.disabled = true;
        }
        // Si ya terminó AE (5), ya no puede volver a tocarlo
        if (etapasActivas.includes("5") || etapasActivas.includes("6") || etapasActivas.includes("7")) {
            btnAE.disabled = true;
        }

        // El verificador solo puede iniciar en 4, 5 o 4.5 (cuando backend lo permita)
        const puedeRevisar =
            etapasActivas.includes("4") ||
            etapasActivas.includes("5") ||
            etapasActivas.includes("6");

        if (!puedeRevisar || etapasActivas.includes("7")) {
            btnVerificador.disabled = true;
        }
    }

    function bloquearBotones(estado) {
        btnMC.disabled = estado;
        btnAE.disabled = estado;
        btnVerificador.disabled = estado;
    }

    function obtenerNombreRol(rol) {
        switch (rol) {
            case "1": return "Supervisor";
            case "2": return "Surtidor MC";
            case "3": return "Verificador";
            case "4": return "Surtidor AE";
            default: return "Desconocido";
        }
    }

    // ================================
    // MODAL EMPLEADO
    // ================================
    let dataPedidoPendiente = null;

    function abrirModalEmpleado(data) {
        dataPedidoPendiente = data;
        const modal = document.getElementById("modalEmpleado");
        const inputModal = document.getElementById("inputEmpleadoModal");
        modal.classList.remove("hidden");
        setTimeout(() => inputModal.focus(), 100);
    }

    function cerrarModal() {
        const modal = document.getElementById("modalEmpleado");
        const inputModal = document.getElementById("inputEmpleadoModal");
        modal.classList.add("hidden");
        inputModal.value = "";
        dataPedidoPendiente = null;
        // Devolver foco al input principal
        inputCodigo.focus();
    }

    document.getElementById("btnCancelarModal").addEventListener("click", () => {
        cerrarModal();
    });

    document.getElementById("btnConfirmarModal").addEventListener("click", confirmarModal);
    document.getElementById("inputEmpleadoModal").addEventListener("keypress", (e) => {
        if (e.key === "Enter") confirmarModal();
    });

    // ================================
    // TOAST
    // ================================
    function mostrarToast(mensaje, tipo = "error") {
        const toast = document.getElementById("toast");
        const inner = document.getElementById("toastInner");
        const texto = document.getElementById("toastMensaje");

        texto.textContent = mensaje;

        inner.className = `mx-4 w-full max-w-sm px-8 py-5 rounded-2xl text-base font-medium text-center
        backdrop-blur-md shadow-2xl border transition-all duration-500
        ${tipo === "error"
                ? "bg-red-500/20 border-red-400/30 text-red-300"
                : "bg-green-500/20 border-green-400/30 text-green-300"
            }`;

        toast.classList.remove("hidden");

        setTimeout(() => {
            toast.classList.add("hidden");
        }, 4500);
    }

    // ================================
    // VALIDAR PERMISO POR ETAPA
    // ================================
    function validarPermisoSegunEtapa() {

        // Rol 1 (supervisor) siempre puede
        if (rolActual === "1") return true;

        const tieneMCInicio = etapasActivas.includes("2");
        const tieneMCFin = etapasActivas.includes("4");
        const tieneAEInicio = etapasActivas.includes("3");
        const tieneAEFin = etapasActivas.includes("5");
        const tieneRevision = etapasActivas.includes("6");
        const tieneRevFin = etapasActivas.includes("7");

        // Surtidor MC (rol 2)
        if (rolActual === "2") {
            // Si MC ya terminó, o ya está en revisión/fin → no puede actuar
            if (tieneMCFin || tieneRevision || tieneRevFin) {
                mostrarToast("El surtido MC ya fue completado en este pedido.");
                inputCodigo.focus();
                return false;
            }
            return true;
        }

        // Surtidor AE (rol 4)
        if (rolActual === "4") {
            // Si AE ya terminó, o ya está en revisión/fin → no puede actuar
            if (tieneAEFin || tieneRevision || tieneRevFin) {
                mostrarToast("El surtido AE ya fue completado en este pedido.");
                inputCodigo.focus();
                return false;
            }
            return true;
        }

        // Verificador (rol 3)
        if (rolActual === "3") {
            // Necesita al menos un fin (4 o 5) y no puede haber surtimientos activos sin concluir
            const hayMCActivo = tieneMCInicio && !tieneMCFin;
            const hayAEActivo = tieneAEInicio && !tieneAEFin;

            if (hayMCActivo || hayAEActivo) {
                mostrarToast("Aún hay surtimientos en proceso. No se puede revisar.");
                inputCodigo.focus();
                return false;
            }

            if (!tieneMCFin && !tieneAEFin && !tieneRevision) {
                mostrarToast("El pedido aun no se ha surtido. No se puede revisar.");
                inputCodigo.focus();
                return false;
            }

            if (tieneRevFin) {
                mostrarToast("Este pedido ya fue revisado y cerrado.");
                inputCodigo.focus();
                return false;
            }

            return true;
        }

        return false;
    }

    // ================================
    // RESET
    // ================================
    function resetearApp() {
        // Limpiar inputs
        inputCodigo.value = "";
        inputBandera.value = "";

        // Limpiar estado
        etapasActivas = [];
        rolActual = null;
        nombreUsuario = null;

        // Ocultar info empleado
        document.getElementById("infoEmpleado").classList.add("hidden");
        document.getElementById("codigoEmpleadoMostrado").textContent = "---";
        document.getElementById("rolEmpleadoMostrado").textContent = "---";

        // Ocultar y resetear botones
        btnMC.style.display = "none";
        btnAE.style.display = "none";
        btnVerificador.style.display = "none";
        btnMC.disabled = false;
        btnAE.disabled = false;
        btnVerificador.disabled = false;

        // Foco de vuelta al input principal
        inputCodigo.focus();
    }

    // ================================
    // CONFIRMAR MODAL — GET + validaciones
    // ================================
    async function confirmarModal() {
        const codigoEmpleado = document.getElementById("inputEmpleadoModal").value.trim();
        if (!codigoEmpleado) return;

        // 1. Validar empleado primero
        const empleadoValido = await validarEmpleado(codigoEmpleado);
        if (!empleadoValido) return;

        // Luego hacer el GET con usuario
        const codigo = inputCodigo.value.trim();
        try {
            const response = await fetch(`${API}/pedidos?pedido=${codigo}&usuario=${nombreUsuario}&rol=${rolActual}`);

            if (!response.ok) {
                const error = await response.json();
                mostrarToast(error.error || error.message || "Error al obtener pedido");
                cerrarModal();
                resetearApp();
                return;
            }

            const data = await response.json();

            inputBandera.value = `${data.ETAPA} - ${data.descripcionEtapa}`;
            etapasActivas = data.ETAPA.toString().split(".");

            const mensajesBloqueo = {
                7: "El pedido ya fue revisado.",
                8: "El pedido está en subdistribuidores.",
                9: "El pedido ya está facturado.",
                10: "El pedido ya fue entregado."
            };

            const etapaBloqueada = etapasActivas.find(e => mensajesBloqueo[e]);
            if (etapaBloqueada) {
                mostrarToast(mensajesBloqueo[etapaBloqueada]);
                cerrarModal();
                resetearApp();
                return;
            }

            if (!validarPermisoSegunEtapa()) {
                cerrarModal();
                resetearApp();
                return;
            }

            cerrarModal();
            bloquearBotones(false);
            actualizarUI();
            configurarBotonesSegunRol();

        } catch (error) {
            console.error("Error:", error);
            mostrarToast("Error de conexión");
            cerrarModal();
            resetearApp();
        }
    }

});
