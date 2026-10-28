package xyz.kolbxyz.kratos;

import androidx.activity.BackEventCompat;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Predictive back for the web app: while the page says it has a screen to go back to, the back
 * gesture is forwarded to it (start, progress, cancel, commit) so it can animate like a native screen.
 * When disabled, the system handles back itself (back-to-home animation).
 */
@CapacitorPlugin(name = "Retour")
public class RetourPlugin extends Plugin {

    private final OnBackPressedCallback rappel = new OnBackPressedCallback(false) {
        @Override
        public void handleOnBackStarted(BackEventCompat e) {
            emettre("debut", e);
        }

        @Override
        public void handleOnBackProgressed(BackEventCompat e) {
            emettre("progres", e);
        }

        @Override
        public void handleOnBackCancelled() {
            emettre("annule", null);
        }

        @Override
        public void handleOnBackPressed() {
            emettre("valide", null);
        }
    };

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), rappel));
    }

    @PluginMethod
    public void activer(PluginCall call) {
        boolean actif = Boolean.TRUE.equals(call.getBoolean("actif", false));
        getActivity().runOnUiThread(() -> rappel.setEnabled(actif));
        call.resolve();
    }

    private void emettre(String type, BackEventCompat e) {
        JSObject data = new JSObject();
        data.put("type", type);
        if (e != null) {
            data.put("progres", e.getProgress());
            data.put("gauche", e.getSwipeEdge() == BackEventCompat.EDGE_LEFT);
        }
        notifyListeners("retour", data);
    }
}
