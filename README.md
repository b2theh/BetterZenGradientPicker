<h1 align="center">BetterZenGradientPicker — Light / Dark</h1>

This fork adds an optional **Separate Light / Dark Gradients** setting. Original mod by [JustADumbPrsn](https://github.com/JustAdumbPrsn/BetterZenGradientPicker); separate appearance support by [b2theh](https://github.com/b2theh).

Install this fork in Sine using **https://github.com/b2theh/BetterZenGradientPicker**. If the original mod is installed, remove it first and restart Zen before installing this fork. Both use the same mod ID and should not run together. This fork retains the original favorites file and preference names.


<div align="center">
  <a href="https://zen-browser.app/">
    <img width="180" alt="Zen Browser" src="https://github.com/user-attachments/assets/d6ab3ddf-6630-4062-92d0-22497d2a3f9a">
  </a>
</div>

<br>

<div align="center">
  <img src="https://github.com/user-attachments/assets/e1034a8b-9c0e-4c1c-b855-fdd2cd357514" width="800">
</div>

---

## Why Does This Exist?

<p align="left">Zen's current gradient picker is great, but it is limited and does not have many features natively.<br><br>I constantly get annoyed by lack of control i have over the graadients created, that is why i made this mod to give user mode control and try to provide an overall better experience to users<br>This is an experimental JS mod which i cant guarentee that it is 100% reliable but as always I have tried my best to make it feel as native as possible. If you experience unusual bugs then please let me know...</p>

---

## Features

<table>
  <tr>
    <td width="50%">
      <h3>Up to 6 Colors</h3>
      <video src="https://github.com/user-attachments/assets/c552008d-a2c6-4692-a47b-8b1e72415b73"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td width="50%">
      <h3>Save Gradient Configurations</h3>
      <video src="https://github.com/user-attachments/assets/97c4ecf3-e5bb-4188-9185-167970416c82"
        autoplay loop muted playsinline width="100%"></video>
    </td>
  </tr>

  <tr>
    <td>
      <h3>Rotation Knob</h3>
      <video src="https://github.com/user-attachments/assets/adb961f5-2cd7-4025-8798-d28fb52986de"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td>
      <h3>Lightness Slider!</h3>
      <video src="https://github.com/user-attachments/assets/56196d3d-95cb-4309-b185-3d9f73f8429e"
        autoplay loop muted playsinline width="100%"></video>
    </td>
  </tr>

  <tr>
    <td>
      <h3>Palette Switcher</h3>
      <video src="https://github.com/user-attachments/assets/bff9bb8a-7a94-4e4a-8165-0b611084b92b"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td>
      <h3>Dynamic Light & Dark Mode (Pref)</h3>
      <video src="https://github.com/user-attachments/assets/496ff780-f6e4-4cb2-bf90-cf8f46335602"
        autoplay loop muted playsinline width="100%"></video>
    </td>
  </tr>

  <tr>
    <td>
      <h3>Lightness Invert (Pref)</h3>
      <video src="https://github.com/user-attachments/assets/da0df409-bfda-4e51-a9d9-ad876c51542b"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td>
      <h3>Randomizer Button</h3>
      <video src="https://github.com/user-attachments/assets/388689cb-badd-4767-9095-0e487db350d6"
        autoplay loop muted playsinline width="100%"></video>
    </td>
  </tr>
</table>

---

## Color Harmonies

<table>
  <tr>
    <td width="33%">
      <h3>Floating</h3>
      <video src="https://github.com/user-attachments/assets/213a74e5-7c42-48c7-974b-2447c5d4b878"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td width="33%">
      <h3>Linear (2–3 colors)</h3>
      <video src="https://github.com/user-attachments/assets/7bd5a18d-01b8-4ae5-874a-e50af06a975f"
        autoplay loop muted playsinline width="100%"></video>
    </td>
    <td width="33%">
      <h3>Hybrid (Linear + Analogous)</h3>
      <video src="https://github.com/user-attachments/assets/31e1d8f2-1e4c-42d5-9e04-c935a5a553de"
        autoplay loop muted playsinline width="100%"></video>
    </td>
  </tr>
</table>

---

## Independent Color Points

Enable **Independent Color Points** in the mod's Sine settings to drag any color point without moving the others. Adding and removing points also preserves the remaining positions. This overrides color harmonies while enabled, and the harmony button is disabled. It works with separate light/dark gradients and favorites.

Point movements are saved using the existing Floating harmony. Disabling the option lets you choose a linked harmony again with the harmony button; it does not rearrange your colors automatically. Brightness, opacity and texture remain gradient-wide controls. Select the Full palette if you want point distance from the center to control brightness individually.

## Separate Light / Dark Gradients

Enable **Separate Light / Dark Gradients** in the mod's Sine settings. It is disabled by default.

1. Switch Zen appearance to **Light**, open a workspace's gradient picker, and customize the light gradient.
2. Switch Zen appearance to **Dark** and customize the dark gradient.
3. Set Zen appearance to **Auto** to follow system appearance, or switch between Light and Dark manually.

Each workspace remembers its own pair, including colors, palette, brightness, opacity, texture, and rotation. When first enabled, the current gradient initializes both variants. Applying a favorite updates the current variant. Switching modes also works with the picker closed.

While enabled, Dynamic Theme and Lightness Inversion are suspended, and text contrast follows Zen's appearance. Their saved preferences are retained. Disabling the option keeps the currently displayed gradient and resumes the original behavior. Re-enabling restores the saved pair; edits made while disabled do not replace it.

This follows appearance changes; it does not set a time-of-day schedule. Configure automatic appearance in your operating system if you want timed changes.

The pairs are stored in local browser preferences under `zen.theme.picker.color-schemes.<workspace UUID>` and survive browser restarts. Private windows keep their edits in memory. These preferences are separate from Zen's workspace themes and the favorites file; Zen workspace sync does not automatically carry the pairs to another device.

Install this fork through Sine using `https://github.com/b2theh/BetterZenGradientPicker`, then restart Zen. You can also toggle the boolean `zen.theme.separate-color-schemes` in `about:config`.

### Verification

Run `node --check BetterZenGradientPicker.uc.js` and `node --test tests/*.test.cjs`. The tests exercise the actual feature and hook code with mocked browser APIs; a manual check in Zen is still needed for UI and runtime integration.

---

## Installation

1. Install **Sine** if you don’t already have it  
   https://github.com/CosmoCreeper/Sine
2. Open **Settings → Sine Mods** (or **Cosine**)
3. Click the settings icon (opens sine's settings)
   
<img width="618" height="82" alt="image" src="https://github.com/user-attachments/assets/b1f9994a-e193-405d-b6df-36d4c1331042" />

5. Check "Enable installing JS from unofficial sources. (unsafe, use at your own risk)"

<img width="750" height="493" alt="image" src="https://github.com/user-attachments/assets/3c26c0f1-d6b9-4dbb-b1ec-770823a07d5f" />

7. Paste this fork's repository link: https://github.com/b2theh/BetterZenGradientPicker

<img width="351" height="82" alt="image" src="https://github.com/user-attachments/assets/bac8715e-796e-4496-8609-6515dcfba8d0" />


