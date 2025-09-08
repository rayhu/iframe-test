# 机位一次性调试与固化方案（Unity WebGL）

> 目标：提供一个仅用于内部/甲方调试的“机位调试模式”。
>
> - 调试时允许鼠标/触控微调相机；
> - 调好后“一键复制参数”或打印到 Console/回传父页；
> - 将参数固化至发布版本，关闭调试入口，避免后续反复修改。

---

## 给客户的话术（简洁版）

我们会提供一个“机位调试模式”。您可以用鼠标把镜头移到满意的位置，然后点击“复制参数”（或截图 Console）把参数发给我们。我们收到参数后，会把机位固定，不再对外暴露调节入口，以免后续频繁改动。

---

## 建议固定的参数项

- pivot：围绕的中心点（通常是头像/胸口）
- yaw / pitch：水平 / 垂直角度（度）
- distance：相机到 pivot 的距离
- fov：视场角（度）
- 限制（可选）：maxYaw / maxPitch / minZoom / maxZoom

---

## Unity 端最小实现（C#，含复制参数）

将脚本挂在 `CameraRig` 上；默认锁定，相机可动需要在 URL 或接口里开启。

```csharp
using UnityEngine;

[System.Serializable]
public class CamSnapshot {
  public Vector3 pivot; // 世界坐标
  public float yaw;     // 度
  public float pitch;   // 度
  public float distance;// 米
  public float fov;     // 度
}

public class CameraTuner : MonoBehaviour {
  public Transform pivot; // 角色头部/胸口空物体
  public Camera cam;
  public bool enableTuning = false; // 仅调试时开启
  public float maxYaw = 20, maxPitch = 12, minZoom = 0.9f, maxZoom = 1.1f, speed = 0.6f;
  public Vector2 defaultAngles = new Vector2(0f, 5f);
  public float defaultDistance = 2.0f;

  float yaw, pitch, dist;

  void Start() {
    yaw = defaultAngles.x; pitch = defaultAngles.y; dist = defaultDistance;
    Apply();
  }

  void Update() {
    if (!enableTuning) return;

    // 鼠标/触摸简易交互
    if (Input.GetMouseButton(0)) {
      yaw   += Input.GetAxis("Mouse X") * speed * 60f;
      pitch -= Input.GetAxis("Mouse Y") * speed * 60f;
    }
    float scroll = Input.mouseScrollDelta.y * 0.05f;
    dist = Mathf.Clamp(dist * (1f - scroll), defaultDistance * minZoom, defaultDistance * maxZoom);

    yaw   = Mathf.Clamp(yaw,   defaultAngles.x - maxYaw,   defaultAngles.x + maxYaw);
    pitch = Mathf.Clamp(pitch, defaultAngles.y - maxPitch, defaultAngles.y + maxPitch);

    Apply();

    // 按 C 复制参数到剪贴板；按 L 打印到 Console
    if (Input.GetKeyDown(KeyCode.C)) CopySnapshotToClipboard();
    if (Input.GetKeyDown(KeyCode.L)) Debug.Log(GetSnapshotJson());
  }

  void Apply() {
    var rot = Quaternion.Euler(pitch, yaw, 0f);
    cam.transform.position = pivot.position + rot * (Vector3.back * dist);
    cam.transform.rotation = rot;
  }

  string GetSnapshotJson() {
    var s = new CamSnapshot {
      pivot = pivot.position,
      yaw = yaw, pitch = pitch, distance = dist, fov = cam.fieldOfView
    };
    return JsonUtility.ToJson(s);
  }

  public void CopySnapshotToClipboard() {
    GUIUtility.systemCopyBuffer = GetSnapshotJson(); // WebGL 可用
    Debug.Log("Camera snapshot copied: " + GUIUtility.systemCopyBuffer);
  }

  // JS 可以调用这个把机位“定死”
  public void LockFromJson(string json) {
    var s = JsonUtility.FromJson<CamSnapshot>(json);
    pivot.position = s.pivot; yaw = s.yaw; pitch = s.pitch; dist = s.distance; cam.fieldOfView = s.fov;
    enableTuning = false; Apply();
  }
}
```

---

## 使用方式

- 打开“调机位模式”：
  - URL 携带 `?camTune=1`，进入后 `enableTuning = true`
- 客户调好后：按 `C` 复制参数（或按 `L` 打印到 Console），把 JSON 发回

示例 JSON：

```json
{
  "pivot": { "x": 0.02, "y": 1.55, "z": 0.01 },
  "yaw": 3.4,
  "pitch": 7.8,
  "distance": 1.85,
  "fov": 24
}
```

- 上线固化：
  - 将该 JSON 写入发布配置
  - 关闭调机位入口，避免二次修改

---

## 父页辅助（可选）

- 显示一个小浮层：实时显示 `yaw` / `pitch` / `distance` / `fov`，并提供“复制参数”按钮（调用 `CopySnapshotToClipboard`）
- 生成带参数的 URL：便于复现场景，例如 `?camLock=<base64(json)>`；上线后采用锁定参数并移除调机位开关

---

## 交付与流程建议

1. 提供“调机位链接”（包含调试开关）
2. 客户调机位 → 复制 JSON → 发回
3. 将 JSON 固化到线上构建（或通过接口锁定），关闭调机位
4. 如需再次调整，再临时开启开关；默认长期锁定，避免反复提需求

这样做，既满足“客户可自行微调一次”的诉求，又将最终机位固化，流程清晰、风险可控。
