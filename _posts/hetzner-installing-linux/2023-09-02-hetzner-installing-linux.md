---
title: "Hetzner: Installing Linux"
date: 2023-09-02
tags: [unix/linux, cli, hetzner]
---
A few years back I rented a dedicated server from Hetzner. In this piece I will document Hetzner's simplified process for installing linux on the box.

### Installing and configuring

After going through the payment process I received an email containing this information:

```
IPv4 Address:	78.46.174.158
IPv6 Address:	2a01:4f8:190:539a::2
Username:	root
Password:	b2fdbCW4Msfkki
Host key:	hHm0rbOZpc0dfrujJrs1Ry3nnc2oaKSto05kFmzj4h8 (DSA 1024)
qSt2t9EVp7z5ehrJMiSuSHKQ5/1rXL6wzy/I3Su9k8c (ECDSA 256)
qdLfInM7MxtFxr5KNQe8s9qywkVdrvsLUWGzbb0rQQ8 (ED25519 256)
CbqGZzPfRnIXE4o8ErsN+2Q4PXSIu9TGMOubpxf66rA (RSA 3072)
```

With this information we'll be able to log into the box. Using either putty or a terminal of some sorts I log into the box: `ssh root@78.46.174.158` it'll request the password, so I copy that in.

After we do so, we're greeted by Hetzner's Rescue System

<figure>
<img src="/hetzner-installing-linux/rescue.png" alt="Hetzner rescue system">
<figcaption>Hetzner's rescue system when logging into the box with ssh</figcaption>
</figure>

It immediately shows a summary of the system's specs, so the storage, cpu, memory.

From here on, we'll start up Hetzner's tool for installing our OS. We do this by running the installimage binary:
`root@rescue ~ # installimage`
Then we get a menu in which we can make our choice for the distribution to be installed. Its also possible to provide your own image, but I've decided to go with Archlinux:
<figure>
<img src"/hetzner-installing-linux/installimage_menu.png" alt="Installimage menu">
<figcaption>The menu for choosing your distribution</figcaption>
</figure>

So after we've selected Archlinux, an editor (Midnight Commander) is launched with the configuration file.
There's a few options you can set within this configuration, like set up LVM, change the bootloader. I have decided to set up this system in a way calling only for the changes I make below.

Within this configuration file I make the following changes:
`SWRAIDLEVEL 1` to `SWRAIDLEVEL 0`, you dont have to enable RAID as it should be enabled, it should say `SWRAID 1`, meaning RAID has been enabled by default.

and
```
PART swap swap 16G
PART /boot ext3 512M
PART / ext4 1024G
PART /home ext4 all
```

```
PART swap swap 16G
PART /boot ext3 2G
PART / ext4 all
```
You may also change the system's hostname:
`HOSTNAME yourhostname`

So what is happening here, I have decided to use RAID-0, set up a swapfile of 16g, allocate 2g to my (ext3) boot partition, and allocate the rest of the space to my root filesystem at `/` using ext4.

To continue we hit <kbd>F10</kbd> and choose "Yes" to save the configuration.
We'll be greeted by a warning stating that the data on the drives will be deleted, which is to be expected so we continue by choosing "Yes"

Now the script will set up the system according to the OS we chose and configuration we edited. It'll look like this:

```
Hetzner Online GmbH - installimage
 
 Your server will be installed now, this will take some minutes
            You can abort at any time with CTRL+C ...
 
        :  Reading configuration                           done
        :  Loading image file variables                    done
        :  Loading centos specific functions               done
  1/16  :  Deleting partitions                             done
  2/16  :  Test partition size                             done
  3/16  :  Creating partitions and /etc/fstab              done
  4/16  :  Creating software RAID level 0                  done
  5/16  :  Formatting partitions
        :    formatting /dev/md/0 with swap                done
        :    formatting /dev/md/1 with ext3                done
        :    formatting /dev/md/2 with ext4                done
  6/16  :  Mounting partitions                             done
  7/16  :  Sync time via ntp                               done
        :  Importing public key for image validation       done
  8/16  :  Validating image before starting extraction     done
  9/16  :  Extracting image (local)                        done
 10/16  :  Setting up network config                       done
 11/16  :  Executing additional commands
        :    Setting hostname                              done
        :    Generating new SSH keys                       done
        :    Generating mdadm config                       done
        :    Generating ramdisk                            done
        :    Generating ntp config                         done
 12/16  :  Setting up miscellaneous files                  done
 13/16  :  Configuring authentication
        :    Setting root password                         done
        :    Enabling SSH root login with password         done
 14/16  :  Installing bootloader grub                      done
 15/16  :  Running some centos specific functions          done
 16/16  :  Clearing log files                              done
 
                 INSTALLATION COMPLETE
  You can now reboot and log in to your new system with the
same credentials that you used to log into the rescue system.
```

We can reboot the server and log into it with the same credentials.
Since Hetzner's network is set up with DHCP, theres no need for configuring the connection or whatsoever anymore.

### Configuring further after the install

After logging in we can check if the drives have been set up according to our wish:

```
[root@ArchBoX ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
tmpfs			 16G	 0	 16G   0% /tmp
```

```
[root@ArchBoX .config]$ lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE  MOUNTPOINTS
sda       8:0    0  3.6T  0 disk
├─sda1    8:1    0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sda2    8:2    0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sda3    8:3    0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sda4    8:4    0    1M  0 part
sdb       8:16   0  3.6T  0 disk
├─sdb1    8:17   0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sdb2    8:18   0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sdb3    8:19   0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sdb4    8:20   0    1M  0 part
```

All looks fine, but a small change I want to make is changing how /tmp  is mounted. It's mounted as tmpfs which stores the contents in RAM until the next boot. In this case I'd rather have it be part of the rootfs

`systemctl mask tmp.mount` and we `reboot`
Now we can check if it's been masked:

```
[root@ArchBoX ~]# systemctl status tmp.mount
○ tmp.mount
     Loaded: masked (Reason: Unit tmp.mount is masked.)
     Active: inactive (dead)
```
Now we can see `/tmp` hasnt been initialized as `tmpfs`:

```
[root@ArchBoX ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
```

We can now proceed by creating the user account, and setting up SSH.
`useradd -m -G root -S /bin/bash uxodb`
we install sudo and configure sudoers: 
`pacman -Syu sudo`
And for sudoers we'll be using the drop-in function by adding a file with the configuration to `/etc/sudoers.d`. The way I'll configure this will prevent me from having to re-authenticate when using sudo.
`echo "uxodb ALL=(ALL) NOPASSWD: ALL" > /etc/suoders.d/uxodb`

### Creating SSH keys and configuring sshd_config



