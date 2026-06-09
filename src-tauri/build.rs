use std::{fs, path::Path};

fn watch_dir(path: &Path) {
  if !path.exists() {
    return;
  }

  println!("cargo:rerun-if-changed={}", path.display());

  let entries = match fs::read_dir(path) {
    Ok(entries) => entries,
    Err(_) => return,
  };

  for entry in entries.flatten() {
    let child = entry.path();
    if child.is_dir() {
      watch_dir(&child);
    } else {
      println!("cargo:rerun-if-changed={}", child.display());
    }
  }
}

fn main() {
  watch_dir(Path::new("../public"));
  println!("cargo:rerun-if-changed=tauri.conf.json");
  tauri_build::build()
}
