document.addEventListener("DOMContentLoaded", () => {

    const inputCodigo = document.getElementById("codigo");
    const inputBandera = document.getElementById("bandera");

    const btnMC = document.getElementById("btnMC");
    const btnAE = document.getElementById("btnAE");
    const btnVerificador = document.getElementById("btnVerificador");

    console.log("¡App cargada correctamente!");

    const API = "http://DIRECCION_IP/api"

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

        try {
            const response = await fetch(`${API}/pedidos?pedido=${codigo}`);

            if (!response.ok) {
                alert("Error al obtener pedido");
                return;
            }

            const data = await response.json();

            inputBandera.value = `${data.ETAPA} - ${data.descripcionEtapa}`;
            console.log("etapa", data.descripcionEtapa);

            etapasActivas = data.ETAPA.toString().split(".");

            const codigoEmpleado = prompt("Ingrese código de empleado:");

            if (!codigoEmpleado) return;

            await validarEmpleado(codigoEmpleado);
            bloquearBotones(false);

            actualizarUI();

        } catch (error) {
            console.error("Error:", error);
        }

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
            alert("No tiene permiso para ejecutar esta acción");
            return;
        }

        if (!inputCodigo.value || etapasActivas.length === 0) {
            alert("No hay pedido cargado");
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

                alert(`⚠️ ${mensaje}`);

                bloquearBotones(false);
                return;
            }

            const data = await response.json();
            console.log("Respuesta del PATCH:", data);

            // 🔥 SIEMPRE sincronizamos desde backend
            etapasActivas = data.ETAPA.toString().split(".");
            inputBandera.value = `${data.ETAPA} - ${data.descripcionEtapa}`;

            bloquearBotones(false);
            actualizarUI();

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
                alert("Empleado no válido");
                return;
            }

            const data = await response.json();
            console.log("Datos del empleado:", data);

            rolActual = data.ROL;
            nombreUsuario = data.NOMBRE;

            document.getElementById("codigoEmpleadoMostrado").textContent = data.NOMBRE;
            document.getElementById("rolEmpleadoMostrado").textContent = obtenerNombreRol(rolActual);
            document.getElementById("infoEmpleado").classList.remove("hidden");

            configurarBotonesSegunRol();

        } catch (error) {
            console.error(error);
            alert("Error validando empleado");
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

        // Ocultar todo primero
        btnMC.style.display = "none";
        btnAE.style.display = "none";
        btnVerificador.style.display = "none";

        if (rolActual === "1" || rolActual === "2") {
            btnMC.style.display = "block";
        }

        if (rolActual === "1" || rolActual === "4") {
            btnAE.style.display = "block";
        }

        if (rolActual === "1" || rolActual === "3") {
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

});
