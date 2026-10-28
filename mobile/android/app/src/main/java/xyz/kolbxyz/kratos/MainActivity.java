package xyz.kolbxyz.kratos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RetourPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
